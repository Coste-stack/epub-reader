import './App.css'
import { AddBookForm } from '../Book/AddBookForm'
import { BookList } from '../Book/BookList'
import EpubUploader from '../Epub/EpubUploader'
import EpubViewer from '../Epub/EpubViewer'

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
