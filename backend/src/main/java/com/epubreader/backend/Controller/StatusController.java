package com.epubreader.backend.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
public class StatusController {

    @GetMapping("/api/status")
    public ResponseEntity<String> getStatus() {
        return ResponseEntity.ok("OK");
    }
}
