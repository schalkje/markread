# Entity-Relationship Diagrams (ERD)

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Diagrams](./) → ERD2

Entity-Relationship Diagrams show database structure, relationships between entities, and cardinality.

## Basic ERD

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
```

## Simple Database Schema

```mermaid
erDiagram
    USER ||--o{ POST : creates
    USER ||--o{ COMMENT : writes
    POST ||--o{ COMMENT : has

    USER {
        int id PK
        string username
        string email
        datetime created_at
    }

    POST {
        int id PK
        int user_id FK
        string title
        text content
        datetime published_at
    }

    COMMENT {
        int id PK
        int user_id FK
        int post_id FK
        text content
        datetime created_at
    }
```

## Relationship Types

### One-to-One

```mermaid
erDiagram
    USER ||--|| PROFILE : has
```

### One-to-Many

```mermaid
erDiagram
    AUTHOR ||--o{ BOOK : writes
```

### Many-to-Many

```mermaid
erDiagram
    STUDENT }o--o{ COURSE : enrolls
```

### Optional Relationships

```mermaid
erDiagram
    EMPLOYEE ||--o| COMPANY_CAR : "may have"
```

## Colorized Data Warehouse Schema

A dimensional model showing party entities with custom styling:

```mermaid
erDiagram
    party ||--o{ party_person : "extends"
    party ||--o{ party_organization : "extends"
    party }o--|| country : "references"

    party:::dim {
        BIGINT sk_party PK
        STRING fk_country FK
    }

    party_person["party **person**"]:::dim {
        BIGINT sk_party FK
    }

    party_organization:::dim {
        BIGINT sk_party FK
    }

    country:::dim {
        BIGINT country_sk PK
    }

    classDef dim fill:#B7C9A6,stroke:#bdc9b3ff
    classDef cdim fill:#89A66E,stroke:#9EB688
    classDef fact fill:#95B8D1,stroke:#a4bfd3ff
    classDef bridge fill:#C1A8D4,stroke:#D1BAE2
```

This example demonstrates:
- **Inheritance patterns**: Party entity extends to person and organization
- **Foreign key relationships**: Party references country
- **Custom styling**: Dimension tables in green, with defined color classes
- **Entity aliasing**: Using quotes to display formatted names

## E-Commerce Database

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        int customer_id PK
        string name
        string email
        string phone
    }

    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        int order_id PK
        int customer_id FK
        datetime order_date
        decimal total_amount
        string status
    }

    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    PRODUCT {
        int product_id PK
        string name
        string description
        decimal price
        int stock_quantity
    }

    ORDER_ITEM {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
    }

    CATEGORY ||--o{ PRODUCT : contains
    CATEGORY {
        int category_id PK
        string name
        string description
    }
```

## File Storage System

```mermaid
erDiagram
    WORKSPACE ||--o{ FOLDER : contains
    FOLDER ||--o{ FOLDER : "contains (recursive)"
    FOLDER ||--o{ DOCUMENT : contains
    USER ||--o{ DOCUMENT : owns
    DOCUMENT ||--o{ VERSION : has

    WORKSPACE {
        uuid workspace_id PK
        string name
        datetime created_at
    }

    FOLDER {
        uuid folder_id PK
        uuid workspace_id FK
        uuid parent_folder_id FK
        string name
        string path
    }

    DOCUMENT {
        uuid document_id PK
        uuid folder_id FK
        uuid owner_id FK
        string title
        string file_path
        datetime last_modified
    }

    USER {
        uuid user_id PK
        string username
        string email
    }

    VERSION {
        uuid version_id PK
        uuid document_id FK
        int version_number
        datetime created_at
    }
```

## Cardinality Symbols

| Symbol | Meaning |
|--------|---------|
| `\|o`  | Zero or one |
| `\|\|` | Exactly one |
| `}o`   | Zero or more |
| `}\|`  | One or more |

## See Also

- [Class Diagrams](class-diagrams.md)
- [Sequence Diagrams](sequence-diagrams.md)
- [Flowcharts](flowcharts.md)
- [Mermaid Overview](mermaid-overview.md)
