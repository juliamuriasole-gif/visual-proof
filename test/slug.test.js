import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slug.js';

test('root and empty routes become "index"', () => {
  assert.equal(slugify('/'), 'index');
  assert.equal(slugify(''), 'index');
  assert.equal(slugify(undefined), 'index');
});

test('simple and nested routes', () => {
  assert.equal(slugify('/about'), 'about');
  assert.equal(slugify('/blog/post-1/'), 'blog-post-1');
  assert.equal(slugify('/Docs/Getting_Started'), 'docs-getting-started');
});

test('query strings, hashes and absolute URLs are made filesystem-safe', () => {
  assert.equal(slugify('/search?q=a b&page=2'), 'search-q-a-b-page-2');
  assert.equal(slugify('/#pricing'), 'pricing');
  assert.equal(slugify('https://example.com/a/b'), 'a-b');
});
