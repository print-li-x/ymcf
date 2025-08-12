import { defineStore } from 'pinia'
import axios from 'axios'

export const useTyphoonStore = defineStore('typhoon', {
  state: () => ({
    track: null,        // {times,lats,lons,...}
    currentIndex: 0,
  }),
  getters: {
    steps:  s => s.track ? s.track.times.length : 0,
    currentPoint: s => {
      if (!s.track) return null
      return {
        lat : s.track.lats [s.currentIndex],
        lon : s.track.lons [s.currentIndex],
        time: s.track.times[s.currentIndex],
        msl : s.track.msls[s.currentIndex],
        wind: s.track.winds[s.currentIndex],
      }
    }
  },
  actions: {
    async fetchTrack(initLat, initLon, initTimeIdx) {
      const { data } = await axios.post('/variables/trackers', {
        init_lat: initLat, init_lon: initLon, init_time_index: initTimeIdx
      })
      this.track = data.track
      this.currentIndex = 0
    },
    setIndex(i) { this.currentIndex = i }
  }
})
