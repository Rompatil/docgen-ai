"""
Product catalog API service.
Uses FastAPI with async database access.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import os

from .database import get_db, Database
from .auth import get_current_user, User
from .cache import cache_response

router = APIRouter(prefix="/products", tags=["products"])

WAREHOUSE_URL = os.environ.get("WAREHOUSE_API_URL", "http://localhost:8001")
DEFAULT_PAGE_SIZE = int(os.getenv("PAGE_SIZE", "20"))


class ProductCreate(BaseModel):
    """Schema for creating a new product."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    price: float = Field(..., gt=0)
    category: str
    tags: List[str] = []
    sku: str = Field(..., regex=r'^[A-Z]{2}\d{6}$')


class ProductUpdate(BaseModel):
    """Schema for partial product updates."""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class ProductResponse(BaseModel):
    """API response model for a product."""
    id: str
    name: str
    price: float
    category: str
    in_stock: bool
    created_at: datetime


class InventoryManager:
    """Manages product inventory levels and restocking.

    Connects to the warehouse API for real-time stock data
    and handles automatic reorder triggers.
    """

    def __init__(self, db: Database, warehouse_url: str = WAREHOUSE_URL):
        self._db = db
        self._warehouse_url = warehouse_url
        self._reorder_threshold = 10

    async def check_stock(self, product_id: str) -> dict:
        """Check current stock level for a product."""
        product = await self._db.products.find_one({"_id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return {
            "quantity": product.get("stock", 0),
            "warehouse_id": product.get("warehouse_id"),
            "last_updated": product.get("stock_updated_at"),
        }

    async def restock(self, product_id: str, quantity: int) -> dict:
        """Add stock for a product."""
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        result = await self._db.products.update_one(
            {"_id": product_id},
            {"$inc": {"stock": quantity}, "$set": {"stock_updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return await self.check_stock(product_id)

    def _should_reorder(self, current_stock: int) -> bool:
        """Check if stock is below reorder threshold."""
        return current_stock < self._reorder_threshold

    async def get_low_stock_products(self) -> List[dict]:
        """Find all products below reorder threshold."""
        cursor = self._db.products.find({"stock": {"$lt": self._reorder_threshold}})
        return await cursor.to_list(length=100)


@router.get("/", response_model=List[ProductResponse])
@cache_response(ttl=30)
async def list_products(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100),
    db: Database = Depends(get_db),
):
    """List products with optional filtering and pagination."""
    query = {}
    if category:
        query["category"] = category
    skip = (page - 1) * limit
    products = await db.products.find(query).skip(skip).limit(limit).to_list(length=limit)
    return products


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: Database = Depends(get_db)):
    """Get a single product by ID."""
    product = await db.products.find_one({"_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=ProductResponse, status_code=201)
async def create_product(
    product: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Create a new product. Requires authentication."""
    data = product.dict()
    data["created_by"] = current_user.id
    data["created_at"] = datetime.utcnow()
    result = await db.products.insert_one(data)
    data["id"] = str(result.inserted_id)
    return data


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    updates: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Update a product. Requires authentication."""
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.products.update_one({"_id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return await db.products.find_one({"_id": product_id})


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Delete a product. Requires authentication."""
    result = await db.products.delete_one({"_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")


@router.get("/{product_id}/stock")
async def check_stock(product_id: str, db: Database = Depends(get_db)):
    """Check inventory for a product."""
    manager = InventoryManager(db)
    return await manager.check_stock(product_id)


@router.post("/{product_id}/restock")
async def restock_product(
    product_id: str,
    quantity: int = Query(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Restock a product. Requires authentication."""
    manager = InventoryManager(db)
    return await manager.restock(product_id, quantity)


def calculate_discount(price: float, discount_percent: float) -> float:
    """Apply a percentage discount to a price.

    Args:
        price: Original price
        discount_percent: Discount as a percentage (0-100)

    Returns:
        Discounted price, never below zero
    """
    if discount_percent < 0 or discount_percent > 100:
        raise ValueError("Discount must be between 0 and 100")
    return max(0, price * (1 - discount_percent / 100))


def format_price(amount: float, currency: str = "USD") -> str:
    """Format a price with currency symbol."""
    symbols = {"USD": "$", "EUR": "€", "GBP": "£"}
    symbol = symbols.get(currency, currency + " ")
    return f"{symbol}{amount:.2f}"
