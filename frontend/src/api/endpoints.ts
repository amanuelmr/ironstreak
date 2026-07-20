// Local-first data access. These keep the same names/signatures the UI hooks
// already import; the bodies now read/write IndexedDB instead of a backend.
export {
  getOverview,
  getActivity,
  getChallenges,
  getChallenge,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  addChallengeEntry,
  deleteChallengeEntry,
} from "../data/repo";
