(function () {
  const emptyProfile = {
    name: "",
    career: "",
    university: "",
    professor: "",
    term: "",
    bio: "",
    goals: ""
  };

  const emptyDb = {
    version: 3,
    profile: { ...emptyProfile },
    topics: [],
    practiceFiles: [],
    workshops: [],
    exams: [],
    learnings: []
  };

  window.PORTAFOLIO_SEED = emptyDb;
  window.PORTAFOLIO_EMPTY_DB = function () {
    return JSON.parse(JSON.stringify(emptyDb));
  };
})();
