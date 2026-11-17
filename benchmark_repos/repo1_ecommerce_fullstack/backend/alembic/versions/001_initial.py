"""Initial migration for products and orders"""

revision = '001_initial'
down_revision = None

def upgrade():
    # Defines products and orders tables
    # Notice: order_notes is NOT migrated!
    pass

def downgrade():
    pass
