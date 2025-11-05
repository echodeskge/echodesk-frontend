"""
Test token validation script
Run this on your backend: python manage.py shell < test_token_validation.py
"""
from rest_framework.authtoken.models import Token
from tenant_schemas.utils import schema_context
from users.models import User

token_key = "44d39c84fe51295983962693b9ab805c4345b8c2"
tenant_schema = "groot"

print(f"\n{'='*60}")
print(f"Testing Token: {token_key}")
print(f"Tenant Schema: {tenant_schema}")
print(f"{'='*60}\n")

# Test within tenant schema context
with schema_context(tenant_schema):
    try:
        token_obj = Token.objects.select_related('user').get(key=token_key)
        user = token_obj.user
        print(f"✅ SUCCESS: Token is valid!")
        print(f"   User ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Name: {user.first_name} {user.last_name}")
        print(f"   Is Active: {user.is_active}")
        print(f"   Is Staff: {user.is_staff}")
    except Token.DoesNotExist:
        print(f"❌ FAILED: Token not found in {tenant_schema} schema")
        print(f"\n🔍 Checking all tokens in this tenant:")
        tokens = Token.objects.select_related('user').all()[:10]
        if tokens:
            for t in tokens:
                print(f"   - {t.key[:20]}... → {t.user.email}")
        else:
            print(f"   No tokens found in {tenant_schema} schema")
    except Exception as e:
        print(f"❌ ERROR: {e}")

print(f"\n{'='*60}\n")
