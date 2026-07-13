import { redirect } from 'next/navigation';

// The public contact page exposed a personal email address — removed on request.
// Any old links or bookmarks land on the homepage instead.
export default function ContactPage() {
  redirect('/');
}
