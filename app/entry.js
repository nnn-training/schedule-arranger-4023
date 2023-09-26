'use strict';
import $ from 'jquery';
globalThis.jQuery = $;
import bootstrap from 'bootstrap';
import parseCandidateNames from './util';

$('.availability-toggle-button').each((i, e) => {
  const button = $(e);
  button.on('click', () => {
    const scheduleId = button.data('schedule-id');
    const userId = button.data('user-id');
    const candidateId = button.data('candidate-id');
    const availability = parseInt(button.data('availability'));
    const nextAvailability = (availability + 1) % 3;
    $.post(`/schedules/${scheduleId}/users/${userId}/candidates/${candidateId}`,
      { availability: nextAvailability },
      (data) => {
        button.data('availability', data.availability);
        const availabilityLabels = ['欠', '？', '出'];
        button.text(availabilityLabels[data.availability]);

        const buttonStyles = ['btn-danger', 'btn-secondary', 'btn-success'];
        button.removeClass('btn-danger btn-secondary btn-success');
        button.addClass(buttonStyles[data.availability]);
      });
  });
});

const buttonSelfComment = $('#self-comment-button');
buttonSelfComment.on('click', () => {
  const scheduleId = buttonSelfComment.data('schedule-id');
  const userId = buttonSelfComment.data('user-id');
  const comment = prompt('コメントを255文字以内で入力してください。');
  if (comment) {
    $.post(`/schedules/${scheduleId}/users/${userId}/comments`,
      { comment: comment },
      (data) => {
        $('#self-comment').text(data.comment);
      });
  }
});

$('#new-schedule-button').on('click', () => {
  const candidateNames = parseCandidateNames($('#candidates').val());
  if (candidateNames.length === 0) {
    const confirmation = confirm('候補日程が指定されていません。続けますか？');
    return confirmation; // falseを返すとクリックのデフォルト挙動とイベント伝播を防ぐ
  }
});

$('#delete-schedule-button').on('click', clickEvent => {
  const scheduleName = $('#scheduleName').attr('value'); // .val() だと入力中の未確定の名前を取得する
  const button = $(clickEvent.target);
  const numCandidates = button.data('num-candidates');
  const numUsers = button.data('num-users');
  let promptText;
  if (numCandidates > 0) {
    if (numUsers > 0) {
      promptText = `${numCandidates}件の候補日程が存在し、既に${numUsers}人が出欠を表明しています。`;
    } else {
      promptText = `まだ出欠を表明している人はいませんが、${numCandidates}件の候補日程が存在します。`;
    }
    promptText = `予定 "${scheduleName}" には、${promptText}\nこの予定を削除しますか？`;
  } else {
    promptText = `予定 "${scheduleName}" を削除しますか？`;
  }
  const confirmation = confirm(promptText);
  return confirmation;
});
