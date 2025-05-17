export const allTempImages = [
  '/tempImages/1E5A0847.jpg',
  '/tempImages/1E5A0839-Edit.jpg',
  '/tempImages/1E5A0833.jpg',
  '/tempImages/1E5A0814.jpg',
  '/tempImages/1E5A0812.jpg',
  '/tempImages/1E5A0808.jpg',
  '/tempImages/intro-background.jpg',
  '/tempImages/intro-main-image.png',
];

export const weddingDetails = {
    erickson2025: {
      id: 'erickson2025',
      brideName: 'Brooke Christenson',
      groomName: 'Stephen Erickson',
      weddingDate: 'September 5th, 2025',
      introBackground: '/tempImages/mainImages/intro-background.jpg',
      introCouple: '/tempImages/mainImages/intro-main-image.png',
      scrapbookImageFolder: '/tempImages/scrapbookImages',
      rsvpEndpoint: '/api/rsvp/erickson2025',
      isPlated: true,
      platedOptions: [
        {
          name: 'Filet Mignon',
          description: '8oz center-cut, served with red wine reduction, potato gratin, and seasonal vegetables.',
          dietaryTags: ['gluten-free-optional']
        },
        {
          name: 'Pan-Seared Salmon',
          description: 'Atlantic salmon with a lemon-dill sauce, served with quinoa and asparagus.',
          dietaryTags: ['gluten-free', 'dairy-free']
        },
        {
          name: 'Mushroom Risotto',
          description: 'Creamy Arborio rice with a medley of wild mushrooms and parmesan cheese.',
          dietaryTags: ['vegetarian', 'gluten-free']
        }
      ],
      eventAddress: {
        venueName: 'The Grand Hall',
        street: '123 Celebration Ave',
        city: 'Happytown',
        state: 'FL',
        zipCode: '33000',
        country: 'USA'
      }
    },
    defaultWedding: {
      id: 'default',
      brideName: 'Bride Name',
      groomName: 'Groom Name',
      weddingDate: 'Upcoming Date',
      introBackground: '/tempImages/mainImages/intro-background.jpg',
      introCouple: '/tempImages/mainImages/intro-main-image.png',
      scrapbookImageFolder: '/tempImages/scrapbookImages',
      rsvpEndpoint: '/api/rsvp/default',
      isPlated: false,
      platedOptions: [],
      eventAddress: {
        venueName: 'To Be Announced Venue',
        street: '456 Future St',
        city: 'Anticipation City',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      }
    },
  };