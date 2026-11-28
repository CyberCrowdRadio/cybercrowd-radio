const bands = 9;
let records = [];
  function locate(samples) {
    const last = samples[samples.length - 1].time;
    const offsets = samples.map(item => Math.round((last - item.time) * 44100 / 2756));
    let best = Infinity, runnerUp = Infinity, match = null;
    for (const record of records) {
      const frames = record.frames;
      for (let end = offsets[0]; end < frames.length / bands; end++) {
        let error = 0;
        for (let i = 0; i < samples.length && error < runnerUp; i++) {
          const start = (end - offsets[i]) * bands;
          for (let j = 0; j < bands; j++) error += Math.abs(frames[start + j] - samples[i].levels[j]);
        }
        if (error < best) {
          if (!match || record !== match.record || end - match.frame > 16) runnerUp = best;
          best = error;
          match = {record, frame: end, time: last};
        } else if (match && (record !== match.record || Math.abs(end - match.frame) > 16)) {
          runnerUp = Math.min(runnerUp, error);
        }
      }
    }
    return best < 5.5 * samples.length * bands && best < runnerUp * 0.87 ? match : null;
  }


self.onmessage = ({data}) => {
  if (data.records) {
    records = Object.entries(data.records).map(([key, item]) => ({
      key, frames: new Int8Array(Uint8Array.from(atob(item.fingerprint), c => c.charCodeAt(0)).buffer)
    }));
    return;
  }
  const match = locate(data.samples);
  self.postMessage({epoch: data.epoch, match: match && {key: match.record.key, frame: match.frame, time: match.time}});
};
