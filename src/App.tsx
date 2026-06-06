import { AppRouter } from './components/layout/AppRouter'
import { BackgroundMusic } from './components/ui/BackgroundMusic'
import { WelcomeModal } from './components/ui/WelcomeModal'

export default function App() {
  return (
    <>
      <BackgroundMusic />
      <WelcomeModal />
      <AppRouter />
    </>
  )
}