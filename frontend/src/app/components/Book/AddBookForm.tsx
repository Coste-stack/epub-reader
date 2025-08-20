import React, { useState } from "react";
import { addBook } from "../../util/Books";

export const AddBookForm: React.FC<{ onBookAdded?: () => void }> = ({ onBookAdded }) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addBook({ title, author });
    setTitle("");
    setAuthor("");
    onBookAdded?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <input
        placeholder="Author"
        value={author}
        onChange={e => setAuthor(e.target.value)}
        required
      />
      <button type="submit">Add Book</button>
    </form>
  );
};