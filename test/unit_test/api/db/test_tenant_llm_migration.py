from api.db import db_models


class _Cursor:
    def __init__(self, rows=(), rowcount=0):
        self._rows = list(rows)
        self.rowcount = rowcount

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return list(self._rows)


class _FakeDB:
    def __init__(self):
        self.calls = []

    def execute_sql(self, sql, params=None, commit=True):
        normalized = " ".join(sql.split())
        self.calls.append((normalized, params))
        if "COLUMN_NAME = 'id'" in sql:
            return _Cursor(rowcount=0)
        if "COLUMN_NAME = 'temp_id'" in sql:
            return _Cursor(rowcount=0)
        if normalized.startswith("SELECT tenant_id, llm_factory, llm_name FROM tenant_llm"):
            return _Cursor(
                rows=[
                    ("tenant-a", "OpenAI", "gpt-3.5"),
                    ("tenant-a", "OpenAI", "gpt-4"),
                ],
                rowcount=2,
            )
        if normalized.startswith("SELECT COALESCE(MAX(temp_id), 0) FROM tenant_llm"):
            return _Cursor(rows=[(0,)], rowcount=1)
        if normalized.startswith("SELECT COUNT(*) FROM tenant_llm WHERE temp_id IS NULL"):
            return _Cursor(rows=[(0,)], rowcount=1)
        return _Cursor()


def test_mysql_tenant_llm_primary_key_migration_uses_polardbx_safe_updates(monkeypatch):
    fake_db = _FakeDB()
    monkeypatch.setattr(db_models, "DB", fake_db)

    db_models._update_tenant_llm_to_id_primary_key_mysql()

    sql_statements = [sql for sql, _ in fake_db.calls]
    joined_sql = "\n".join(sql_statements)

    assert "UPDATE tenant_llm SET temp_id = (@row := @row + 1)" not in joined_sql
    assert "RENAME COLUMN temp_id TO id" not in joined_sql
    assert any(
        sql.startswith("UPDATE tenant_llm SET temp_id=%s WHERE tenant_id=%s AND llm_factory=%s AND llm_name=%s")
        for sql in sql_statements
    )
    assert "ALTER TABLE tenant_llm CHANGE COLUMN temp_id id INT NOT NULL AUTO_INCREMENT PRIMARY KEY" in joined_sql


def test_mysql_tenant_llm_primary_key_migration_skips_when_id_exists(monkeypatch):
    class ExistingIdDB(_FakeDB):
        def execute_sql(self, sql, params=None, commit=True):
            normalized = " ".join(sql.split())
            self.calls.append((normalized, params))
            if "COLUMN_NAME = 'id'" in sql:
                return _Cursor(rows=[("id",)], rowcount=1)
            return _Cursor()

    fake_db = ExistingIdDB()
    monkeypatch.setattr(db_models, "DB", fake_db)

    db_models._update_tenant_llm_to_id_primary_key_mysql()

    assert len(fake_db.calls) == 1
