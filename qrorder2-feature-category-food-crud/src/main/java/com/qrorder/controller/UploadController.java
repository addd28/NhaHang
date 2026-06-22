package com.qrorder.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/upload")
public class UploadController {

    private static final Set<String> ALLOWED_TYPES = Set.of("menu-items", "posts", "qr");

    @PostMapping
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", required = false, defaultValue = "menu-items") String type
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }

        // Validate type to prevent folder traversal
        String folderType = type.toLowerCase();
        if (!ALLOWED_TYPES.contains(folderType)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid upload type. Allowed: menu-items, posts, qr"));
        }

        try {
            // Target folder uploads/<type>
            File uploadDir = new File("uploads/" + folderType);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueName = UUID.randomUUID().toString() + extension;

            File destFile = new File(uploadDir, uniqueName);
            file.transferTo(destFile.getAbsoluteFile());

            // Build relative URL to return
            String fileUrl = "/api/uploads/" + folderType + "/" + uniqueName;
            return ResponseEntity.ok(Map.of("url", fileUrl));

        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("message", "File upload failed: " + e.getMessage()));
        }
    }
}
