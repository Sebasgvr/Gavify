import { ref } from 'vue'

export const songs = [
  { id: 0, title: 'As It Was', artist: 'Harry Styles', plays: 48, color: '#e9b949' },
  { id: 1, title: 'Blinding Lights', artist: 'The Weeknd', plays: 42, color: '#e66e55' },
  { id: 2, title: 'Flowers', artist: 'Miley Cyrus', plays: 37, color: '#c97dba' },
  { id: 3, title: 'Calm Down', artist: 'Rema, Selena Gomez', plays: 32, color: '#79a9c7' }
]

export const selectedSongs = ref([])
export const isResolved = ref(false)

export function toggleSongSelection(index) {
  if (selectedSongs.value.includes(index)) {
    selectedSongs.value = selectedSongs.value.filter(i => i !== index)
  } else {
    selectedSongs.value.push(index)
  }
}

export function resolveSongs() {
  isResolved.value = true
}
