export default async function ProfilePage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  return <main className="p-8"><h1 className="text-2xl">Profile: {username}</h1></main>;
}
