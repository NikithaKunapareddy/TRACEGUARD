from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Text

Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)

# CODING GAP: New model added in code but migration was never created!
class OrderNotes(Base):
    __tablename__ = "order_notes"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, nullable=False)
    note = Column(Text, nullable=False)
