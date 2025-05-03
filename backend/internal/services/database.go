package services

import (
	"fmt"
	"time"

	"ride_sharing/backend/internal/config"
	"ride_sharing/backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Database struct {
	*gorm.DB
}

func NewDatabase(cfg *config.Config) (*Database, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	// Auto-migrate the schema
	err = db.AutoMigrate(&models.Ride{})
	if err != nil {
		return nil, fmt.Errorf("failed to migrate database: %v", err)
	}

	return &Database{db}, nil
}

func (db *Database) CreateRide(ride *models.Ride) error {
	// Generate a new UUID for the ride
	ride.ID = uuid.New().String()
	ride.CreatedAt = time.Now()
	ride.UpdatedAt = time.Now()
	ride.Status = "available"

	result := db.Create(ride)
	if result.Error != nil {
		return fmt.Errorf("failed to create ride: %v", result.Error)
	}

	return nil
}

func (db *Database) GetRides() ([]models.Ride, error) {
	var rides []models.Ride
	result := db.Find(&rides)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to get rides: %v", result.Error)
	}

	return rides, nil
}

func (db *Database) GetRideByID(id string) (*models.Ride, error) {
	var ride models.Ride
	result := db.First(&ride, "id = ?", id)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to get ride: %v", result.Error)
	}

	return &ride, nil
}

func (db *Database) UpdateRide(ride *models.Ride) error {
	ride.UpdatedAt = time.Now()
	result := db.Save(ride)
	if result.Error != nil {
		return fmt.Errorf("failed to update ride: %v", result.Error)
	}

	return nil
}

func (db *Database) DeleteRide(id string) error {
	result := db.Delete(&models.Ride{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete ride: %v", result.Error)
	}

	return nil
}

func (db *Database) FindRides(from, to, date, searchTime string) ([]models.Ride, error) {
	var rides []models.Ride

	inputDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, fmt.Errorf("invalid date format: %v", err)
	}
	nextDay := inputDate.Add(24 * time.Hour).Format("2006-01-02")

	result := db.Where(
		"\"from\" ILIKE ? AND \"to\" ILIKE ? AND ((date = ? AND time >= ?) OR (date = ?))",
		from, to, date, searchTime, nextDay,
	).Find(&rides)

	if result.Error != nil {
		return nil, fmt.Errorf("failed to find rides: %v", result.Error)
	}
	return rides, nil
}
