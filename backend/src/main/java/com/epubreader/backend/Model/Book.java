package com.epubreader.backend.Model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class Book {
    @Id
    @GeneratedValue
    private Long id;

    @Column(unique = true)
    private String title;
    private String author;

    @Lob
    private byte[] coverBlob;

    private Double progress;
    private LocalDateTime progressSynchedAt;
    private Boolean isFileUploaded;
    private Boolean isFavorite;

    public Long getId() {
        return id;
    }

    public byte[] getCoverBlob() {
        return coverBlob;
    }

    public void setCoverBlob(byte[] coverBlob) {
        this.coverBlob = coverBlob;
    }

    public Double getProgress() {
        return progress;
    }

    public void setProgress(Double progress) {
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
