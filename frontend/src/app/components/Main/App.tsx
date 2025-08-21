import './App.css'
import { AddBookForm } from '../Book/AddBookForm'
import { BookList } from '../Book/BookList'
import EpubUploader from '../Epub/EpubUploader'
import { useToast } from '../../util/Toast/toast-context'

function App() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast?.open('Toast message!Toast message!Toast message!Toast message!')}>Message</button>
      <AddBookForm />
      <BookList />
      <EpubUploader />
    </>
  )
}

export default App
