package config

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

// NewDB creates a new database connection
func NewDB() (*sql.DB, error) {
	config := LoadConfig()

	// Validate required configuration
	if config.DBPassword == "" {
		return nil, fmt.Errorf("database password is required")
	}

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		config.DBHost, config.DBPort, config.DBUser, config.DBPassword, config.DBName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %v", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * 60) // 5 minutes

	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to the database: %v", err)
	}

	log.Println("Successfully connected to database")
	return db, nil
}
