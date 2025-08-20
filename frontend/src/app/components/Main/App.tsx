import './App.css'
import { AddBookForm } from '../Book/AddBookForm'
import { BookList } from '../Book/BookList'
import EpubUploader from '../Epub/EpubUploader'

function App() {
  return (
    <>
      <AddBookForm />
      <BookList />
      <EpubUploader />
    </>
  )
}

export default App
