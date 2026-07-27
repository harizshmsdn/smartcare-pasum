import { useEffect, useState } from 'react'
import { Routes, useLocation, useNavigationType } from 'react-router-dom'

export default function AnimatedRoutes({ children }) {
  const location = useLocation()
  const navigationType = useNavigationType() // 'PUSH' | 'POP' | 'REPLACE'
  const [displayLocation, setDisplayLocation] = useState(location)
  const [stage, setStage] = useState('enter') // 'enter' | 'exit'

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setStage('exit')
    }
  }, [location, displayLocation])

  const direction = navigationType === 'POP' ? 'back' : 'forward'
  const enterClass = direction === 'back' ? 'screen-enter-back' : 'screen-enter-forward'
  const exitClass = direction === 'back' ? 'screen-exit-back' : 'screen-exit-forward'

  const handleAnimationEnd = () => {
    if (stage === 'exit') {
      setDisplayLocation(location)
      setStage('enter')
    }
  }

  return (
    <div
      key={stage === 'exit' ? displayLocation.pathname : location.pathname}
      className={`screen-transition ${stage === 'exit' ? `${exitClass} is-exiting` : enterClass}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <Routes location={displayLocation}>{children}</Routes>
    </div>
  )
}