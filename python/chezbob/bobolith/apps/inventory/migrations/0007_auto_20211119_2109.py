# Generated by Django 3.2.7 on 2021-11-19 21:09

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0006_alter_inventory_last_restocked_at'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='inventory',
            options={'verbose_name_plural': 'Inventory'},
        ),
        migrations.AlterField(
            model_name='inventory',
            name='product',
            field=models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name='inventory', to='inventory.product', verbose_name='product'),
        ),
        migrations.AlterField(
            model_name='product',
            name='name',
            field=models.CharField(max_length=255, verbose_name='name'),
        ),
    ]
