import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({
  open,
  title = 'Are you sure?',
  message = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel
}) => {
  if (!open) return null;

  return (
    <div className="cm-backdrop" onClick={onCancel}>
      <div className="cm-modal" onClick={e => e.stopPropagation()}>
        <div className="cm-header">
          <h3 className="cm-title">{title}</h3>
          <button className="cm-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="cm-body">
          {typeof message === 'string' ? <p className="cm-message">{message}</p> : message}
        </div>
        <div className="cm-footer">
          <button className="cm-btn cm-btn-cancel" onClick={onCancel}>{cancelText}</button>
          <button
            className={`cm-btn cm-btn-confirm${danger ? ' cm-btn-danger' : ''}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
