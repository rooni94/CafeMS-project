from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)

    def __str__(self): return self.name

    def _generate_unique_slug(self, base_value: str) -> str:
        base_slug = slugify(base_value) or "category"
        slug = base_slug
        counter = 1
        qs = Category.objects.exclude(pk=self.pk) if self.pk else Category.objects.all()
        while qs.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def save(self, *args, **kwargs):
        source_value = self.slug or self.name or "category"
        self.slug = self._generate_unique_slug(source_value)
        super().save(*args, **kwargs)


class SubCategory(models.Model):
    category = models.ForeignKey(Category, related_name="subcategories", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/sub/", blank=True, null=True)

    def __str__(self):
        return f"{self.category.name} - {self.name}"

    def _generate_unique_slug(self, base_value: str) -> str:
        base_slug = slugify(base_value) or "subcategory"
        slug = base_slug
        counter = 1
        qs = SubCategory.objects.exclude(pk=self.pk) if self.pk else SubCategory.objects.all()
        while qs.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def save(self, *args, **kwargs):
        base_value = self.slug or ""
        if not base_value:
            prefix = (
                (self.category.slug or self.category.name)
                if self.category_id
                else "subcategory"
            )
            base_value = f"{prefix}-{self.name}"
        self.slug = self._generate_unique_slug(base_value)
        super().save(*args, **kwargs)

class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.SET_NULL, null=True)
    subcategory = models.ForeignKey(SubCategory, related_name='products', on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    track_inventory = models.BooleanField(default=True)
    minimum_stock = models.PositiveIntegerField(default=5)
    available = models.BooleanField(default=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.name


class ProductAddon(models.Model):
    product = models.ForeignKey(Product, related_name="addons", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    price_delta = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.product.name} - {self.name}"
