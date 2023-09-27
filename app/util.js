'use strict';

function parseCandidateNames(candidates) {
  return candidates.trim().split('\n').map((s) => s.trim()).filter((s) => s !== "");
}

module.exports = parseCandidateNames;
