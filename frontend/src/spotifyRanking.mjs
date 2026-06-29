export function getSpotifyProfileImageUrl(user = {}) {
  const direct =
    user.profileImageUrl ||
    user.profile_image_url ||
    user.profileimageurl ||
    user.profileImage ||
    user.imageUrl ||
    ''

  if (direct) return direct

  const imageFromList = Array.isArray(user.images)
    ? user.images.find(image => image?.url)?.url
    : ''

  return imageFromList || ''
}
