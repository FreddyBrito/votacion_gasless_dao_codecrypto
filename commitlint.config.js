module.exports = {
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // New feature
      'fix',      // Bug fix
      'docs',     // Documentation only
      'style',    // Formatting, no code change
      'refactor', // Code change that neither fixes a bug nor adds a feature
      'test',     // Adding or correcting tests
      'chore',    // Build process, dependencies, configs
      'perf',     // Performance improvement
      'ci',       // CI/CD changes
      'revert',   // Reverts a previous commit
    ]],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
};
