import { AppRouter } from './components/layout/AppRouter'
import { BackgroundMusic } from './components/ui/BackgroundMusic'
import { WelcomeModal } from './components/ui/WelcomeModal'
import { InstallPWAButton } from './components/ui/InstallPWAButton'

export default function App() {
  return (
    <>
      <BackgroundMusic />
      <WelcomeModal />
      <InstallPWAButton />
      <AppRouter />
    </>
  )
}