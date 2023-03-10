import Image from 'next/image';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Item } from 'types/item';
import { RentalHistory } from 'types/user';
import styles from 'styles/detail.module.css';
import UseSWR, { mutate } from 'swr';
import { SessionUser } from '../api/getUser';
import Header from '../../components/Header';
import Head from 'next/head';
import Player from '../../components/Player';
import loadStyles from 'styles/loading.module.css';
import Review from '../../components/Review';
import ReviewBtn from 'components/ReviewBtn';
import prisma from '../../../lib/prisma';
import Countdown from '../../components/Countdown';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export async function getStaticPaths() {
  const data = await prisma.item.findMany();
  const paths = data.map((item: { itemId: number }) => {
    return {
      params: {
        id: item.itemId.toString(),
      },
    };
  });
  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({
  params,
}: {
  params: { id: string };
}) {
  const id = parseInt(params.id);
  const item: Item | null = await prisma.item.findUnique({
    where: {
      itemId: id,
    },
  });
  if (!item) {
    return {
      redirect: {
        destination: '/error',
      },
    };
  }
  if (item?.releaseDate) {
    item.releaseDate = item?.releaseDate.toString();
  }
  return {
    props: {
      item,
    },
  };
}

export default function ItemDetail({ item }: { item: Item }) {
  const [price, setPrice] = useState(0);
  const [period, setPeriod] = useState(0);
  const [isChoiced, setIsChoiced] = useState(false);
  const [start, setStart] = useState(false);
  const [startId, setStartId] = useState(0);
  const [rental, setRental] = useState<RentalHistory[]>([]);

  const startPlayer = (id: number) => {
    setStart(!start);
    setStartId(id);
  };

  const { data } = UseSWR<SessionUser>('/api/getUser', fetcher);

  const userId = data?.userId;
  useEffect(() => {
    fetch(`/api/selectRental/${userId}`)
      .then((res) => res.json())
      .then((result) => {
        setRental(result.rental);
      });
  }, [userId]);

  const isLoggedIn = data?.isLoggedIn;

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

  let carts = data.userCarts;
  let cartflg = false;
  let rentalPeriod;
  let rentalCartId: number;
  let isRentaled = false;
  let rentalFlg;
  let rentalStart;
  let rentalEnd;
  let startFlg;
  let nowDate = new Date();
  let rentalHistory: RentalHistory[] = rental;

  let rentaledItems = rentalHistory?.filter((rentaledItem) => {
    return rentaledItem.itemId === item.itemId;
  });

  // ???????????????????????????????????????????????????
  if (rentaledItems?.length) {
    isRentaled = true;
  }

  // ??????????????????????????????
  if (!rentaledItems?.length) {
    rentalFlg = false;
  } else if (rentaledItems.length) {
    // ????????????????????????????????????????????????????????????????????????
    let lastItem = rentaledItems.slice(-1)[0];
    if (!lastItem.rentalEnd) {
      rentalFlg = true;
      startFlg = false;
      rentalCartId = lastItem.rentalHistoryId;
      rentalPeriod = '?????????';
    } else if (lastItem.rentalStart && lastItem.rentalEnd) {
      startFlg = true;
      rentalStart = new Date(lastItem.rentalStart);
      rentalEnd = new Date(lastItem.rentalEnd);
      if (rentalEnd > nowDate) {
        rentalFlg = true;
      }
    }
  }

  // ??????????????????????????????????????????????????????
  if (!isLoggedIn) {
    rentalFlg = false;
    mutate('api/getUser');
  }

  let cartId: number;
  if (carts) {
    // ???????????????????????????????????????????????????itemId????????????????????????
    const check = carts.filter((cart) => {
      return cart.itemId === item.itemId;
    });
    if (check.length) {
      cartflg = true;
      cartId = check[0].cartId;
      mutate('/api/getUser');
    }
  }

  // ???????????????????????????????????????
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let num = Number(e.target.value);
    chengeRentalPeriod(num);
  };

  // ??????????????????????????????????????????
  const chengeRentalPeriod = (num: number) => {
    if (num === 2) {
      setPeriod(num);
      setPrice(item.twoDaysPrice);
    } else {
      setPeriod(num);
      setPrice(item.sevenDaysPrice);
    }
  };

  // ???????????????????????????????????????
  const handleAddItem = async (item: Item) => {
    // ?????????????????????????????????????????????
    if (price === 0 || period === 0) {
      setIsChoiced(true);
      return;
    }

    // ????????????id?????????
    const id = data.userId;
    const itemId = item.itemId;

    // ???????????????
    if (id !== undefined) {
      await fetch(`/api/addCart/${id}/${itemId}/${period}`)
        .then((res) => res.json())
        .then((result) => {
          if (isChoiced === true) {
            setIsChoiced(!isChoiced);
          }
          if (result.isAdd === true) {
            cartflg = true;
            mutate('/api/getUser');
          }
        })
        .catch((error) => {
          console.log('Error', error);
        });
    } else {
      // ???????????????

      let cartId: number;
      if (!data.userCarts) {
        cartId = 1;
      } else {
        cartId = data.userCarts.length + 1;
      }

      let userCarts = {
        cartId: cartId,
        rentalPeriod: period,
        itemImage: item.itemImage,
        itemId: item.itemId,
        items: item,
      };

      const body = { cart: userCarts };
      // cookie????????????????????????/api/cart????????????
      fetch(`/api/addCart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
        .then((res) => res.json())
        .then((result) => {
          if (isChoiced === true) {
            setIsChoiced(!isChoiced);
          }
          cartflg = true;
          mutate('/api/getUser');
        })
        .catch((error) => {
          console.log('Error', error);
        });
    }
  };

  // ??????????????????????????????????????????
  const handleDelte = async (item: Item) => {
    const id = data.userId;
    // ????????????????????????
    if (id !== undefined) {
      await fetch(`/api/deleteCart/${cartId}`);
      mutate('/api/getUser');
    } else {
      // ????????????????????????
      const body = { id: item.itemId, detail: true };

      await fetch(`/api/itemDelete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
        .then((res) => res.json())
        .then((result) => {
          cartflg = false;
          mutate('/api/getUser');
        })
        .catch((error) => {
          console.log('Error', error);
        });
    }
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
    item: Item
  ) => {
    e.preventDefault();
    cartflg ? handleDelte(item) : handleAddItem(item);
  };
  const closePlayer = () => {
    setStart(!start);
    mutate('/api/getUser');
  };

  return (
    <>
      <Head>
        <title>{`${item.artist} ${item.fesName}`}</title>
      </Head>
      <Header
        isLoggedIn={data?.isLoggedIn}
        dologout={() => mutate('/api/getUser')}
      />
      <div className={styles.detailImgWrapper}>
        <Image
          className={styles.detailImg}
          src={item.itemImage}
          alt="??????"
          sizes="100vw"
          fill
          priority
        />
        <p className={styles.detailTitle}>{item.artist}</p>
      </div>
      <main className={styles.detail}>
        <form onSubmit={(e) => handleSubmit(e, item)}>
          <div>
            <div className={styles.detaiContainer}>
              <div className={styles.detailBodyWrapper}>
                <div className={styles.detailBody}>
                  <div className={styles.detailBodyInner}>
                    <p>{item.itemDetail}</p>
                    <p>{item.fesName}</p>
                    <p>{item.playTime}???</p>
                  </div>
                  {rentalFlg ? (
                    <div className={styles.btnWrapper}>
                      {startFlg ? (
                        rentalEnd &&
                        rentalStart && (
                          <Countdown
                            endTime={rentalEnd}
                            startTime={rentalStart}
                          />
                        )
                      ) : (
                        <p>???????????????{rentalPeriod}</p>
                      )}
                      <button
                        className={`${styles.btn} ${styles.pushdown}`}
                        onClick={() => startPlayer(rentalCartId)}
                      >
                        ??????
                      </button>
                    </div>
                  ) : (
                    <>
                      {cartflg ? (
                        <div className={styles.detailRadioWrapper}>
                          <div className={styles.detailBtnWrapper}>
                            <button
                              type="submit"
                              className={`${styles.detailBtn} ${styles.bgleft}`}
                            >
                              <span>?????????????????????</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.detailRadioWrapper}>
                          <p className={styles.detailLerge}>
                            ????????????????????????
                          </p>
                          <label
                            htmlFor="palyTime"
                            className={styles.middleOnlyMr50}
                          >
                            <input
                              type="radio"
                              name="palyTime"
                              value={2}
                              onChange={(e) => handleChange(e)}
                            />
                            48??????&nbsp;{item.twoDaysPrice}???
                          </label>
                          <br className={styles.middleOnly} />
                          <label htmlFor="palyTime">
                            <input
                              type="radio"
                              name="palyTime"
                              value={7}
                              onChange={(e) => handleChange(e)}
                            />
                            7???&nbsp;{item.sevenDaysPrice}???
                          </label>
                          <br />
                          <p className={styles.cartAlert}>
                            {isChoiced
                              ? '?????????????????????????????????????????????'
                              : ''}
                          </p>
                          <div className={styles.detailBtnWrapper}>
                            <button
                              type="submit"
                              className={`${styles.detailBtn} ${styles.bgleft}`}
                            >
                              <span>??????????????????</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <style jsx>{`
              p {
                margin-block-start: 0;
                margin-block-end: 0;
              }
            `}</style>
          </div>
        </form>
        {start && (
          <Player
            closePlayer={() => closePlayer()}
            id={startId}
            startPlayer={() => mutate('/api/getUser')}
          />
        )}
        <section className={styles.review}>
          <div className={styles.listWrpper}>
            <div className={styles.listInner}>
              <Review itemId={item.itemId} />
            </div>
            <div className={styles.tac}>
              <ReviewBtn
                userId={userId}
                id={item.itemId}
                isRentaled={isRentaled}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
