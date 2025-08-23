package com.epubreader.backend.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

import java.time.LocalDateTime;

@Entity
public class Book {
    @Id
    @GeneratedValue
    private Long id;
    @Column(unique = true)
    private String title;
    private String author;
    private String coverPath;

    private Integer progress;
    private LocalDateTime progressSynchedAt;
    private Boolean isFileUploaded;
    private Boolean isFavorite;

    public Long getId() {
        return id;
    }

    public String getCoverPath() {
        return coverPath;
    }

    public void setCoverPath(String coverPath) {
        this.coverPath = coverPath;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public LocalDateTime getProgressSynchedAt() {
        return progressSynchedAt;
    }

    public void setProgressSynchedAt(LocalDateTime progressSynchedAt) {
        this.progressSynchedAt = progressSynchedAt;
    }

    public Boolean getFileUploaded() {
        return isFileUploaded;
    }

    public void setFileUploaded(Boolean fileUploaded) {
        isFileUploaded = fileUploaded;
    }

    public Boolean getFavorite() {
        return isFavorite;
    }

    public void setFavorite(Boolean favorite) {
        isFavorite = favorite;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }
}
