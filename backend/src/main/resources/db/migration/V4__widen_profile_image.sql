-- Widen profile_image column so candidate-uploaded resized avatars can persist alongside OAuth URLs
ALTER TABLE users
    MODIFY COLUMN profile_image MEDIUMTEXT NULL;
