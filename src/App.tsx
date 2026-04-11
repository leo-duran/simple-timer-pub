import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js'
import QRCode from 'qrcode'
import './App.css'

function App() {
  const [secondsLeft, setSecondsLeft] = createSignal(0)
  const [isRunning, setIsRunning] = createSignal(false)
  const [startSeconds, setStartSeconds] = createSignal(0)

  let intervalId: number | undefined
  let audioContext: AudioContext | undefined

  const playCompletionTone = () => {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return

    if (!audioContext) {
      audioContext = new AudioContextCtor()
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }

    const startAt = audioContext.currentTime
    const notes = [880, 1174.66, 1318.51]

    notes.forEach((frequency, index) => {
      const oscillator = audioContext!.createOscillator()
      const gainNode = audioContext!.createGain()
      const noteStart = startAt + index * 0.16
      const noteDuration = 0.14

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(frequency, noteStart)
      gainNode.gain.setValueAtTime(0.0001, noteStart)
      gainNode.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration)

      oscillator.connect(gainNode)
      gainNode.connect(audioContext!.destination)
      oscillator.start(noteStart)
      oscillator.stop(noteStart + noteDuration)
    })
  }

  const addMinute = () => {
    if (isRunning()) return
    setSecondsLeft((value) => Math.min(value + 60, 99 * 60 + 59))
  }

  const addSecond = () => {
    if (isRunning()) return
    setSecondsLeft((value) => Math.min(value + 1, 99 * 60 + 59))
  }

  const toggleStartStop = () => {
    if (!isRunning() && secondsLeft() === 0) return
    if (!isRunning()) {
      setStartSeconds(secondsLeft())
    }
    setIsRunning((value) => !value)
  }

  const clearTimer = () => {
    setIsRunning(false)
    setSecondsLeft(0)
    setStartSeconds(0)
  }

  createEffect(() => {
    if (!isRunning()) {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
        intervalId = undefined
      }
      return
    }

    intervalId = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setIsRunning(false)
          playCompletionTone()
          return startSeconds()
        }

        return value - 1
      })
    }, 1000)
  })

  onCleanup(() => {
    if (intervalId !== undefined) {
      window.clearInterval(intervalId)
    }

    if (audioContext) {
      void audioContext.close()
      audioContext = undefined
    }
  })

  const minutes = createMemo(() => Math.floor(secondsLeft() / 60))
  const seconds = createMemo(() => secondsLeft() % 60)
  const displayDigits = createMemo(
    () => `${minutes().toString().padStart(2, '0')}${seconds().toString().padStart(2, '0')}`,
  )

  const shareUrl = () => new URL(import.meta.env.BASE_URL || '/', window.location.origin).href

  const [qrDataUrl, setQrDataUrl] = createSignal('')

  onMount(() => {
    void QRCode.toDataURL(shareUrl(), {
      width: 200,
      margin: 2,
      color: { dark: '#0f1419', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl)
  })

  return (
    <main class="page">
      <section class="timer" aria-label="Simple timer">
        <div class="display-shell">
          <div class="digits" aria-live="polite">
            {displayDigits()}
          </div>
          <div class="units">
            <span>M</span>
            <span>S</span>
          </div>
        </div>

        <div class="labels">
          <span>MIN</span>
          <span>SEC</span>
          <span>START/STOP</span>
        </div>

        <div class="buttons">
          <button type="button" class="button set" onClick={addMinute} disabled={isRunning()}>
            M
          </button>
          <button type="button" class="button set" onClick={addSecond} disabled={isRunning()}>
            S
          </button>
          <button
            type="button"
            class="button action"
            onClick={toggleStartStop}
            disabled={!isRunning() && secondsLeft() === 0}
          >
            {isRunning() ? 'STOP' : 'START'}
          </button>
        </div>

        <button type="button" class="clear" onClick={clearTimer}>
          CLEAR
        </button>
      </section>

      <section class="share" aria-label="Open this app elsewhere">
        <h2 class="share-heading">Open on another device</h2>
        <div class="qr-frame">
          <Show
            when={qrDataUrl()}
            fallback={<div class="qr-placeholder" aria-hidden="true" />}
          >
            <img
              class="qr-image"
              src={qrDataUrl()}
              width={200}
              height={200}
              alt="QR code linking to this timer app"
            />
          </Show>
        </div>
        <a class="share-link" href={shareUrl()} rel="noopener noreferrer">
          {shareUrl()}
        </a>
      </section>
    </main>
  )
}

export default App
