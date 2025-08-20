package com.epubreader.backend.Repository;

import com.epubreader.backend.Model.Book;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookRepository extends JpaRepository<Book, Long> {
}
