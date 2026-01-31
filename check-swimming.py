import mysql.connector
import os
import re
from urllib.parse import urlparse, parse_qs

# Parse DATABASE_URL
db_url = os.environ.get('DATABASE_URL', '')
match = re.match(r'mysql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)\??(.*)', db_url)

if not match:
    print("Error: Could not parse DATABASE_URL")
    exit(1)

user, password, host, port, database, params = match.groups()

# Connect to database
conn = mysql.connector.connect(
    host=host,
    port=int(port),
    user=user,
    password=password,
    database=database,
    ssl_disabled=True
)

cursor = conn.cursor(dictionary=True)

# Check for duplicate swimming events
query = """
SELECT date, type, description, COUNT(*) as count
FROM events
WHERE type LIKE '%nata%'
GROUP BY date, type, description
HAVING count > 1
ORDER BY date
"""

cursor.execute(query)
duplicates = cursor.fetchall()

print(f"\n=== NATAÇÃO DUPLICADA ===")
print(f"Total de grupos duplicados: {len(duplicates)}")

if duplicates:
    print("\nPrimeiros 10 grupos duplicados:")
    for i, dup in enumerate(duplicates[:10]):
        print(f"{i+1}. Data: {dup['date']}, Tipo: {dup['type']}, Descrição: {dup['description']}, Quantidade: {dup['count']}")

# Count total swimming events
cursor.execute("SELECT COUNT(*) as total FROM events WHERE type LIKE '%nata%'")
total = cursor.fetchone()
print(f"\nTotal de eventos de natação: {total['total']}")

cursor.close()
conn.close()
