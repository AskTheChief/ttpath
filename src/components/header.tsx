import Link from 'next/link';
import { Button } from './ui/button';

    export default function Header() {
      return (
        <>
          <header>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex-shrink-0">
                  <Link href="/" className="font-brand text-3xl text-primary">
                    The Trading Tribe
                  </Link>
                </div>
                <div className="flex items-center">
                  <Link href="/admin/feedback" passHref>
                    <Button variant="ghost">Admin</Button>
                  </Link>
                </div>
              </div>
            </div>
          </header>
        </>
      );
    }