'use strict';
import $ from 'jquery';
globalThis.jQuery = $;

import 'bootstrap/dist/js/bootstrap.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';

$('.self-comment-button').each((i, e) => {
  const button = $(e);
  button.on('click', () => {
    const blogId = button.data('blog-id');
    const userId = button.data('user-id');
    const commentId = button.data('comment-id');
    const comment = prompt('コメントを255文字以内で入力してください。', button.data('blog-comment'));
    if (comment) {
      fetch(`/blogs/${blogId}/users/${userId}/comments/${commentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment })
      }).then(response => response.json())
        .then(data => {
          button.closest('tr').find('.self-comment').text(data.comment);
        });
    }
  });
});

const shareUrl = window.location.href;
const shareUrlInput = $('#share-url');
const shareUrlCopyButton = $('#copy-button');

shareUrlInput.val(shareUrl);

shareUrlCopyButton.on('click', () => {
  navigator.clipboard.writeText(shareUrl).then(() => {
    shareUrlCopyButton.text('Copied!');
    setTimeout(() => shareUrlCopyButton.text('Copy'), 1000);
  });
});