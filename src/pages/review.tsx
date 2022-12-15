import Head from 'next/head';
import Image from 'next/image';
import { SyntheticEvent, useRef, useState } from 'react';
import UseSWR from 'swr';
import { SessionUser } from './api/getUser';
import loadStyles from 'styles/loading.module.css';
import reviewStyles from 'styles/review.module.css';
import router from 'next/router';
import { Item } from 'types/item';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Review({ post }: { post: Item }) {
  const { data } = UseSWR<SessionUser>('/api/getUser', fetcher); //ユーザー情報取得

  const [formReviewName, setFormReviewName] = useState('');
  const [formReviewText, setFormReviewText] = useState('');
  const [formEvaluation, setFormEvaluation] = useState(0);
  const [formSpoiler, setFormSpoiler] = useState(false);

  const review = useRef<HTMLDivElement>(null);

  if (!data)
    return (
      <div className={loadStyles.loadingArea}>
        <div className={loadStyles.bound}>
          <span>L</span>
          <span>o</span>
          <span>a</span>
          <span>d</span>
          <span>i</span>
          <span>g</span>
          <span>...</span>
        </div>
      </div>
    );
  if (!data.isLoggedIn) {
    router.push(`/`);
  }

  //星を押した時
  const handleClick = function (e: SyntheticEvent) {
    setFormEvaluation(Number((e.target as Element).id));

    for (let j = 0; j < 5; j++) {
      review.current?.children[j].classList.remove(
        `${reviewStyles.active}`
      );
    }

    for (let j = 0; j < Number((e.target as Element).id); j++) {
      review.current?.children[j].classList.add(
        `${reviewStyles.active}`
      );
    }
  };

  //投稿ボタンを押した時
  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const postTime = new Date();
    const postTimeYear = postTime.getFullYear();
    const postTimeMonth = postTime.getMonth() + 1;
    const postTimeDate = postTime.getDate();
    const postTimeHours = postTime.getHours();
    const postTimeMinutes = postTime.getMinutes();

    const nowPostTime = `${postTimeYear}/${postTimeMonth}/${postTimeDate} ${postTimeHours}:${postTimeMinutes}`;

    const body = {
      userId: data.userId,
      itemId: post.id,
      itemImg: post.itemImage,
      itemName: post.fesName,
      userName: data.userName,
      postTime: nowPostTime,
      reviewName: formReviewName,
      reviewText: formReviewText,
      evaluation: formEvaluation,
      spoiler: formSpoiler,
      reviewId: 1,
    };

    await fetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-type': 'application/json', //Jsonファイルということを知らせるために行う
      },
    }).then(() => {
      router.push(`/items/${post.id}`); //e.preventDefault()を行なった為、クライアント側の遷移処理をここで行う
    });
  };

  return (
    <>
      <Head>
        <title>{post.fesName}レビュー</title>
      </Head>

      <div>
        <Image
          src={`${post.itemImage}`}
          alt="画像"
          width={400}
          height={225}
        />
        <p>{post.fesName}</p>
      </div>
      <main>
        <h2>レビュー</h2>
        <p>ユーザー{data.userName}</p>
        <form onSubmit={handleSubmit}>
          <div>
            <div ref={review}>
              <span
                className={reviewStyles.evaluation}
                id="1"
                onClick={(e) => handleClick(e)}
              >
                ★
              </span>
              <span
                className={reviewStyles.evaluation}
                id="2"
                onClick={(e) => handleClick(e)}
              >
                ★
              </span>
              <span
                className={reviewStyles.evaluation}
                id="3"
                onClick={(e) => handleClick(e)}
              >
                ★
              </span>
              <span
                className={reviewStyles.evaluation}
                id="4"
                onClick={(e) => handleClick(e)}
              >
                ★
              </span>
              <span
                className={reviewStyles.evaluation}
                id="5"
                onClick={(e) => handleClick(e)}
              >
                ★
              </span>
            </div>

            <div>
              <label>レビュータイトル</label>
            </div>
            <input
              type="text"
              name="reviewName"
              id="reviewName"
              value={formReviewName}
              onChange={(e) => setFormReviewName(e.target.value)}
            />

            <ul>
              <p>ネタバレ</p>
              <li key={1}>
                <input
                  name="spoiler"
                  id="1"
                  type="radio"
                  value={1}
                  onChange={(e) => setFormSpoiler(true)}
                />
                <label htmlFor="1">あり</label>
              </li>
              <li key={2}>
                <input
                  name="spoiler"
                  id="2"
                  type="radio"
                  value={2}
                  onChange={(e) => setFormSpoiler(false)}
                />
                <label htmlFor="2">なし</label>
              </li>
            </ul>

            <div>
              <label>レビュー追加</label>
            </div>
            <input
              type="text"
              name="reviewText"
              id="reviewText"
              value={formReviewText}
              onChange={(e) => setFormReviewText(e.target.value)}
            />
          </div>
          <div>
            <button type="submit">投稿する</button>
          </div>
        </form>
      </main>
    </>
  );
}

export async function getServerSideProps({ query }: { query: any }) {
  const response = await fetch(
    `http://localhost:8000/items/${query.itemId}`,
    {
      method: 'GET',
    }
  );
  const dates: Item = await response.json();

  return {
    props: { post: dates },
  };
}
