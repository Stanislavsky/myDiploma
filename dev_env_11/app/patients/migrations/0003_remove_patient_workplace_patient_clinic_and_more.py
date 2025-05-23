# Generated by Django 5.2 on 2025-05-15 21:11

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('doctorProfile', '0002_patient'),
        ('patients', '0002_patient_workplace'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='patient',
            name='workplace',
        ),
        migrations.AddField(
            model_name='patient',
            name='clinic',
            field=models.CharField(blank=True, max_length=255, verbose_name='Поликлиника'),
        ),
        migrations.AddField(
            model_name='patient',
            name='doctor',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='patients_list', to='doctorProfile.doctorprofile'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='patient',
            name='gender',
            field=models.CharField(choices=[('male', 'Мужской'), ('female', 'Женский')], max_length=6, verbose_name='Пол'),
        ),
    ]
