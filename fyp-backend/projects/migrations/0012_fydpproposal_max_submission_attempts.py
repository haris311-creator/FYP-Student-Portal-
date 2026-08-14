from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0011_remove_groupmember_has_special_permission_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='fydpproposal',
            name='max_submission_attempts',
            field=models.PositiveIntegerField(default=3),
        ),
    ]
