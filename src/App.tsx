import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js'
import QRCode from 'qrcode'
import './App.css'

function App() {
  const [secondsLeft, setSecondsLeft] = createSignal(0)
  const [isRunning, setIsRunning] = createSignal(false)
  const [startSeconds, setStartSeconds] = createSignal(0)
  const [isAlarming, setIsAlarming] = createSignal(false)

  let intervalId: number | undefined
  let alarmIntervalId: number | undefined
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
    if (isAlarming()) { dismissAlarm(); return }
    if (isRunning()) return
    setSecondsLeft((value) => Math.min(value + 60, 99 * 60 + 59))
  }

  const addSecond = () => {
    if (isAlarming()) { dismissAlarm(); return }
    if (isRunning()) return
    setSecondsLeft((value) => Math.min(value + 1, 99 * 60 + 59))
  }

  const toggleStartStop = () => {
    if (isAlarming()) { dismissAlarm(); return }
    if (!isRunning() && secondsLeft() === 0) return
    if (!isRunning()) {
      setStartSeconds(secondsLeft())
    }
    setIsRunning((value) => !value)
  }

  const clearTimer = () => {
    if (isAlarming()) { dismissAlarm(); return }
    setIsRunning(false)
    setSecondsLeft(0)
    setStartSeconds(0)
  }

  const dismissAlarm = () => {
    setIsAlarming(false)
    if (secondsLeft() === 0 && startSeconds() > 0) {
      setSecondsLeft(startSeconds())
    }
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
          setIsAlarming(true)
          playCompletionTone()
          return 0
        }

        return value - 1
      })
    }, 1000)
  })

  createEffect(() => {
    if (!isAlarming()) return

    alarmIntervalId = window.setInterval(() => {
      playCompletionTone()
    }, 2000)

    onCleanup(() => {
      if (alarmIntervalId !== undefined) {
        window.clearInterval(alarmIntervalId)
        alarmIntervalId = undefined
      }
    })
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
    () => `${minutes().toString().padStart(2, '0')}:${seconds().toString().padStart(2, '0')}`,
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
        <div class={`display-shell${isAlarming() ? ' alarming' : ''}`}>
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
          <span>{isAlarming() ? 'DISMISS' : 'START/STOP'}</span>
        </div>

        <div class="buttons">
          <button type="button" class="button set" onClick={addMinute} disabled={isRunning() && !isAlarming()}>
            M
          </button>
          <button type="button" class="button set" onClick={addSecond} disabled={isRunning() && !isAlarming()}>
            S
          </button>
          <button
            type="button"
            class={`button action${isAlarming() ? ' alarming' : ''}`}
            onClick={toggleStartStop}
            disabled={!isAlarming() && !isRunning() && secondsLeft() === 0}
          >
            {isAlarming() ? 'DISMISS' : isRunning() ? 'STOP' : 'START'}
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
