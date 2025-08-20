import './App.css'
import { AddBookForm } from './assets/components/AddBookForm'
import { BookList } from './assets/components/BookList'
import EpubUploader from './EpubUploader'
import EpubViewer from './EpubViewer'

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
