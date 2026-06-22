package com.qrorder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class QrOrderApplication {

	public static void main(String[] args) {
		SpringApplication.run(QrOrderApplication.class, args);
	}
}
