package com.qrorder.service;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class DbInfoTest {

    @Test
    public void printInfo() throws Exception {
        Class.forName("com.mysql.cj.jdbc.Driver");
        try (Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/qr_code?useSSL=false&serverTimezone=UTC", "root", "root")) {
            System.out.println("==================================================");
            System.out.println("=== FLYWAY SCHEMA HISTORY ===");
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT installed_rank, version, description, success FROM flyway_schema_history")) {
                while (rs.next()) {
                    System.out.printf("Rank: %d, Version: %s, Desc: %s, Success: %b%n",
                            rs.getInt("installed_rank"), rs.getString("version"),
                            rs.getString("description"), rs.getBoolean("success"));
                }
            } catch (Exception e) {
                System.out.println("Could not query flyway_schema_history: " + e.getMessage());
            }

            System.out.println("\n=== DESCRIBE RESERVATIONS ===");
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("DESCRIBE reservations")) {
                while (rs.next()) {
                    System.out.printf("Field: %s, Type: %s, Null: %s, Key: %s, Default: %s%n",
                            rs.getString("Field"), rs.getString("Type"),
                            rs.getString("Null"), rs.getString("Key"),
                            rs.getString("Default"));
                }
            }
            System.out.println("==================================================");
        }
    }
}
