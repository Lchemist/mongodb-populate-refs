/* eslint-disable no-template-curly-in-string */
module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/github',
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    '@semantic-release/npm',
    [
      '@semantic-release/git',
      {
        assets: ['package{,-lock}.json', 'CHANGELOG.md'],
        message: 'chore(release): 🚀 ${nextRelease.gitTag} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
}
