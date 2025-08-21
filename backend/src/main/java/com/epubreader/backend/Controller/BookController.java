package com.epubreader.backend.Controller;

import com.epubreader.backend.Model.Book;
import com.epubreader.backend.Service.BookService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.io.FilenameUtils;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/books")
public class BookController {

    @Value("${book.upload.dir}")
    private String BOOK_UPLOAD_DIR;

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    @GetMapping
    public List<Book> getAllBooks() {
        return bookService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Book> getBookById(@PathVariable Long id) {
        Optional<Book> book = bookService.findById(id);
        return book.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Book addBook(@RequestBody Book book) {
        return bookService.save(book);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Book> updateBook(@PathVariable Long id, @RequestBody Book updatedBook) {
        Optional<Book> optionalBook = bookService.findById(id);
        if (optionalBook.isPresent()) {
            Book book = optionalBook.get();
            book.setTitle(updatedBook.getTitle());
            book.setAuthor(updatedBook.getAuthor());
            book.setProgress(updatedBook.getProgress());
            book.setFavorite(updatedBook.getFavorite());
            return ResponseEntity.ok(bookService.save(book));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        if (bookService.findById(id).isPresent()) {
            bookService.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("{id}/upload")
    public ResponseEntity<String> uploadBookFile(@PathVariable Long id, @RequestParam("file") MultipartFile multipartFile) throws IOException {
        if (multipartFile.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        // Check if extension is .epub
        String extension = FilenameUtils.getExtension(multipartFile.getOriginalFilename());
        if (!extension.equalsIgnoreCase("epub")) {
            return ResponseEntity.badRequest().body("File must be an epub");
        }

        // Find the book in the database
        Optional<Book> optionalBook = bookService.findById(id);
        if (optionalBook.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Book book = optionalBook.get();

        // Save file to disk
        String fileName = "book_" + id + ".epub";
        File file = new File(BOOK_UPLOAD_DIR + fileName);
        multipartFile.transferTo(file);

        // Update isFileUploaded in database
        book.setFileUploaded(true);
        bookService.save(book);

        return ResponseEntity.ok("File uploaded successfully");
    }
}
