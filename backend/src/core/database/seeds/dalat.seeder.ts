import dataSource from '../data-source';
import { toWktPoint } from '../../../shared/utils/geo.util';

interface SeedPlace {
  name: string;
  category: 'attraction' | 'restaurant' | 'cafe';
  subcategory: string;
  isOutdoor: boolean;
  hasAc: boolean;
  suitableWeather: string[];
  priceLevel: 1 | 2 | 3;
  rating: number;
  address: string;
  description: string;
  lat: number;
  lng: number;
}

interface SeedStay {
  name: string;
  stayType: 'hotel' | 'homestay' | 'resort';
  pricePerNight: number;
  rating: number;
  address: string;
  lat: number;
  lng: number;
  amenities: string[];
}

const CORE_PLACES: SeedPlace[] = [
  // Attractions - Outdoor
  {
    name: 'Hồ Xuân Hương',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy', 'cool'],
    priceLevel: 1,
    rating: 4.8,
    address: 'Phường 1, TP. Đà Lạt',
    description: 'Biểu tượng trung tâm Đà Lạt, lý tưởng đi dạo và đạp vịt buổi sáng hoặc chiều mát.',
    lat: 11.9404,
    lng: 108.4450,
  },
  {
    name: 'Quảng trường Lâm Viên',
    category: 'attraction',
    subcategory: 'check_in',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy', 'cool'],
    priceLevel: 1,
    rating: 4.7,
    address: 'Đường Trần Quốc Toản, Phường 10, TP. Đà Lạt',
    description: 'Nụ hoa Atiso và Bông hoa Dã Quỳ khổng lồ bên bờ Hồ Xuân Hương.',
    lat: 11.9396,
    lng: 108.4452,
  },
  {
    name: 'Đồi Chè Cầu Đất',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 1,
    rating: 4.8,
    address: 'Thôn Trường Thọ, Xã Trạm Hành, TP. Đà Lạt',
    description: 'Đồi chè xanh mướt trên cao nguyên, điểm săn mây sáng sớm nổi tiếng.',
    lat: 11.8256,
    lng: 108.5621,
  },
  {
    name: 'Đỉnh Langbiang',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 2,
    rating: 4.7,
    address: 'Thị trấn Lạc Dương, Lâm Đồng',
    description: 'Nóc nhà Đà Lạt với tầm nhìn toàn cảnh Suối Vàng và thành phố.',
    lat: 12.0445,
    lng: 108.4384,
  },
  {
    name: 'Thác Datanla',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 2,
    rating: 4.7,
    address: 'QL20 Đèo Prenn, Phường 3, TP. Đà Lạt',
    description: 'Khu du lịch thác nước kết hợp máng trượt xuyên rừng thông dài nhất Đông Nam Á.',
    lat: 11.9012,
    lng: 108.4496,
  },
  {
    name: 'Hồ Tuyền Lâm',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy', 'cool'],
    priceLevel: 1,
    rating: 4.8,
    address: 'Phường 4, TP. Đà Lạt',
    description: 'Hồ nước ngọt rộng lớn bao quanh bởi rừng thông và Thiền viện Trúc Lâm.',
    lat: 11.8942,
    lng: 108.4301,
  },
  {
    name: 'Thiền Viện Trúc Lâm Đà Lạt',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 1,
    rating: 4.8,
    address: 'Đường Trúc Lâm Yên Tử, Phường 3, TP. Đà Lạt',
    description: 'Thiền viện thanh tịnh trên núi Phượng Hoàng nhìn xuống Hồ Tuyền Lâm.',
    lat: 11.9032,
    lng: 108.4351,
  },
  {
    name: 'Vườn Hoa Thành Phố Đà Lạt',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 2,
    rating: 4.5,
    address: '2 Trần Nhân Tông, Phường 8, TP. Đà Lạt',
    description: 'Bộ sưu tập hàng trăm loài hoa đặc trưng của xứ sở sương mù.',
    lat: 11.9491,
    lng: 108.4508,
  },
  {
    name: 'Thung Lũng Tình Yêu',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 3,
    rating: 4.5,
    address: '7 Mai Anh Đào, Phường 8, TP. Đà Lạt',
    description: 'Khu sinh thái đồi thông, hồ Đa Thiện và cầu kính ngàn thông.',
    lat: 11.9776,
    lng: 108.4492,
  },
  {
    name: 'Đồi Thiên Phúc Đức',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 1,
    rating: 4.6,
    address: 'Phường 7, TP. Đà Lạt',
    description: 'Điểm ngắm bình minh, săn mây và cây thông cô đơn gần trung tâm.',
    lat: 11.9814,
    lng: 108.4241,
  },

  // Attractions - Indoor (Plan B eligible for rainy weather)
  {
    name: 'Bảo tàng Lâm Đồng',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold', 'hot'],
    priceLevel: 1,
    rating: 4.6,
    address: '4 Hùng Vương, Phường 10, TP. Đà Lạt',
    description: 'Không gian trưng bày văn hóa Tây Nguyên trong nhà và Cung Nam Phương Hoàng Hậu.',
    lat: 11.9418,
    lng: 108.4589,
  },
  {
    name: 'Biệt điện Trần Lệ Xuân (Trung tâm Lưu trữ Quốc gia IV)',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold'],
    priceLevel: 1,
    rating: 4.6,
    address: '2 Yết Kiêu, Phường 5, TP. Đà Lạt',
    description: 'Nơi lưu giữ và trưng bày Mộc bản Triều Nguyễn - Di sản tư liệu thế giới UNESCO.',
    lat: 11.9432,
    lng: 108.4238,
  },
  {
    name: 'Dinh III Bảo Đại',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold'],
    priceLevel: 2,
    rating: 4.5,
    address: '1 Triệu Việt Vương, Phường 4, TP. Đà Lạt',
    description: 'Dinh thự kiến trúc Pháp cổ điển của vua Bảo Đại, tham quan hoàn toàn trong nhà.',
    lat: 11.9302,
    lng: 108.4295,
  },
  {
    name: 'Dinh I Đà Lạt',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold'],
    priceLevel: 2,
    rating: 4.5,
    address: 'Trần Quang Diệu, Phường 10, TP. Đà Lạt',
    description: 'Dinh thự cổ kính với các phòng trưng bày lịch sử bên trong.',
    lat: 11.9334,
    lng: 108.4692,
  },
  {
    name: 'Dinh II Toàn Quyền Decoux',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold'],
    priceLevel: 1,
    rating: 4.4,
    address: '12 Trần Hưng Đạo, Phường 10, TP. Đà Lạt',
    description: 'Lâu đài mùa hè của Toàn quyền Đông Dương với hầm rượu và nội thất cổ.',
    lat: 11.9378,
    lng: 108.4524,
  },
  {
    name: 'Biệt thự Hằng Nga (Crazy House)',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'sunny', 'cloudy'],
    priceLevel: 2,
    rating: 4.6,
    address: '3 Huỳnh Thúc Kháng, Phường 4, TP. Đà Lạt',
    description: 'Công trình kiến trúc kỳ dị với hệ thống phòng trưng bày và hành lang trong nhà.',
    lat: 11.9347,
    lng: 108.4307,
  },
  {
    name: 'Bảo tàng Sinh học Tây Nguyên',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold'],
    priceLevel: 1,
    rating: 4.5,
    address: '116 Xô Viết Nghệ Tĩnh, Phường 7, TP. Đà Lạt',
    description: 'Tòa nhà đá cổ kính trưng bày mẫu vật động thực vật Tây Nguyên trong nhà.',
    lat: 11.9698,
    lng: 108.4312,
  },
  {
    name: 'XQ Sử Quán Đà Lạt',
    category: 'attraction',
    subcategory: 'workshop',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold', 'hot'],
    priceLevel: 2,
    rating: 4.6,
    address: '80A Mai Anh Đào, Phường 8, TP. Đà Lạt',
    description: 'Không gian triển lãm nghệ thuật tranh thêu tay truyền thống và thưởng trà trong nhà.',
    lat: 11.9718,
    lng: 108.4475,
  },
  {
    name: 'Vườn Ánh Sáng Lumiere Đà Lạt',
    category: 'attraction',
    subcategory: 'workshop',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold', 'hot'],
    priceLevel: 2,
    rating: 4.5,
    address: '222B Mai Anh Đào, Phường 8, TP. Đà Lạt',
    description: 'Khu triển lãm ánh sáng nghệ thuật 3D hoàn toàn trong nhà, cực hợp trú mưa.',
    lat: 11.9742,
    lng: 108.4488,
  },
  {
    name: 'Ga Đà Lạt (Phòng Trưng Bày & Toa Tàu Cổ)',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'sunny', 'cloudy'],
    priceLevel: 1,
    rating: 4.6,
    address: '1 Quang Trung, Phường 10, TP. Đà Lạt',
    description: 'Nhà ga cổ nhất Đông Dương với sảnh kiến trúc Pháp và quán cafe trong toa tàu gỗ.',
    lat: 11.9419,
    lng: 108.4583,
  },

  // Restaurants - Hotpot, BBQ, Local Specialties
  {
    name: 'Lẩu Gà Lá É Tao Ngộ',
    category: 'restaurant',
    subcategory: 'hotpot',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'cold', 'cloudy'],
    priceLevel: 2,
    rating: 4.6,
    address: '5 Đường 3/4, Phường 3, TP. Đà Lạt',
    description: 'Quán lẩu gà lá é trứ danh Đà Lạt, nước dùng cay the ấm bụng ngày mưa lạnh.',
    lat: 11.9362,
    lng: 108.4451,
  },
  {
    name: 'Lẩu Bò Ba Toa Quán Gỗ',
    category: 'restaurant',
    subcategory: 'hotpot',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'cold', 'cloudy'],
    priceLevel: 2,
    rating: 4.6,
    address: '1/29 Hoàng Diệu, Phường 5, TP. Đà Lạt',
    description: 'Lẩu bò Ba Toa truyền thống với nồi nước dùng đậm đà trong ngôi nhà gỗ ấm cúng.',
    lat: 11.9371,
    lng: 108.4275,
  },
  {
    name: 'Tiệm Nướng Túi Mơ To',
    category: 'restaurant',
    subcategory: 'bbq',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy', 'cool'],
    priceLevel: 2,
    rating: 4.7,
    address: 'Hẻm 31 Sào Nam, Phường 11, TP. Đà Lạt',
    description: 'Không gian nướng ngoài trời ngắm thung lũng đèn lồng về đêm.',
    lat: 11.9465,
    lng: 108.4782,
  },
  {
    name: 'Tiệm Nướng Hoàng Hôn (Indoor & Mái Che)',
    category: 'restaurant',
    subcategory: 'bbq',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'cold', 'cloudy'],
    priceLevel: 2,
    rating: 4.6,
    address: '112 Hùng Vương, Phường 11, TP. Đà Lạt',
    description: 'Khu vực bàn nướng có mái che kín gió, thưởng thức BBQ nóng hổi ngày mưa.',
    lat: 11.9448,
    lng: 108.4712,
  },
  {
    name: 'Bánh Căn Lệ Đà Lạt',
    category: 'restaurant',
    subcategory: 'noodles',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'cold', 'cloudy', 'sunny'],
    priceLevel: 1,
    rating: 4.5,
    address: '27/44 Yersin, Phường 10, TP. Đà Lạt',
    description: 'Bánh căn nóng hổi ăn kèm xíu mại chén ấm bụng buổi sáng và chiều mưa.',
    lat: 11.9435,
    lng: 108.4541,
  },
  {
    name: 'Bánh Ướt Lòng Gà Trang',
    category: 'restaurant',
    subcategory: 'noodles',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'hot'],
    priceLevel: 1,
    rating: 4.5,
    address: '15F Tăng Bạt Hổ, Phường 1, TP. Đà Lạt',
    description: 'Đặc sản bánh ướt lòng gà khu Hòa Bình, không gian trong nhà sạch sẽ.',
    lat: 11.9429,
    lng: 108.4368,
  },
  {
    name: 'Kem Bơ Thanh Thảo',
    category: 'restaurant',
    subcategory: 'refreshment',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['sunny', 'hot', 'cloudy'],
    priceLevel: 1,
    rating: 4.6,
    address: '76 Nguyễn Văn Trỗi, Phường 2, TP. Đà Lạt',
    description: 'Kem bơ sầu riêng mát lạnh, rất hợp giải nhiệt buổi trưa nắng.',
    lat: 11.9458,
    lng: 108.4352,
  },
  {
    name: 'Nhà Hàng Memory Đà Lạt',
    category: 'restaurant',
    subcategory: 'hotpot',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'cold', 'sunny', 'cloudy'],
    priceLevel: 3,
    rating: 4.7,
    address: '24 Hùng Vương, Phường 10, TP. Đà Lạt',
    description: 'Biệt thự ẩm thực trong nhà ấm cúng kết hợp đêm nhạc acoustic và lẩu cá tầm.',
    lat: 11.9426,
    lng: 108.4631,
  },
  {
    name: 'Nem Nướng Bà Hùng',
    category: 'restaurant',
    subcategory: 'bbq',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold'],
    priceLevel: 2,
    rating: 4.5,
    address: '328 Phan Đình Phùng, Phường 2, TP. Đà Lạt',
    description: 'Nem nướng cuốn bánh tráng giòn chấm tương đậu phộng nóng.',
    lat: 11.9489,
    lng: 108.4335,
  },
  {
    name: 'Lẩu Cá Tầm Ngư Sơn',
    category: 'restaurant',
    subcategory: 'hotpot',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'cold', 'cloudy'],
    priceLevel: 2,
    rating: 4.6,
    address: '33 Trương Công Định, Phường 1, TP. Đà Lạt',
    description: 'Lẩu cá tầm măng chua nóng hổi ngay khu vực trung tâm.',
    lat: 11.9415,
    lng: 108.4342,
  },

  // Cafes - Indoor & Outdoor
  {
    name: 'Tùng Cafe Khu Hòa Bình',
    category: 'cafe',
    subcategory: 'workshop',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'cold', 'cloudy'],
    priceLevel: 1,
    rating: 4.7,
    address: '6 Khu Hòa Bình, Phường 1, TP. Đà Lạt',
    description: 'Quán cà phê cổ điển hơn nửa thế kỷ, nơi nghe nhạc Trịnh và trú mưa Đà Lạt.',
    lat: 11.9423,
    lng: 108.4366,
  },
  {
    name: 'La Viet Coffee (Xưởng Cà Phê)',
    category: 'cafe',
    subcategory: 'workshop',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'cold'],
    priceLevel: 2,
    rating: 4.7,
    address: '200 Nguyễn Công Trứ, Phường 8, TP. Đà Lạt',
    description: 'Xưởng rang xay và trải nghiệm pha chế cà phê Specialty hoàn toàn trong nhà.',
    lat: 11.9592,
    lng: 108.4421,
  },
  {
    name: 'Mê Linh Coffee Garden',
    category: 'cafe',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 2,
    rating: 4.6,
    address: 'Tổ 20 Thôn 4, Xã Tà Nung, TP. Đà Lạt',
    description: 'Cà phê chồn giữa đồi thông và hồ nước mênh mông.',
    lat: 11.8984,
    lng: 108.3526,
  },
  {
    name: 'Horizon Coffee Đà Lạt',
    category: 'cafe',
    subcategory: 'check_in',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 2,
    rating: 4.6,
    address: '31/6 Đường 3/4, Phường 3, TP. Đà Lạt',
    description: 'Quán cà phê săn mây trên đồi cao với cầu treo giữa rừng thông.',
    lat: 11.9228,
    lng: 108.4461,
  },
  {
    name: 'An Cafe Đà Lạt',
    category: 'cafe',
    subcategory: 'refreshment',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'sunny', 'cloudy', 'hot'],
    priceLevel: 2,
    rating: 4.6,
    address: '63Bis Ba Tháng Hai, Phường 1, TP. Đà Lạt',
    description: 'Không gian nhà kính trồng rau sạch, ấm áp khi trời mưa và mát mẻ khi trời nắng.',
    lat: 11.9412,
    lng: 108.4331,
  },
];

function buildFullPlacesCatalog(): SeedPlace[] {
  const places: SeedPlace[] = [...CORE_PLACES];

  // Expand to ~50 attractions & cafes and ~70 restaurants (total 120 places)
  const extraAttractionsAndCafes: Omit<SeedPlace, 'lat' | 'lng'>[] = [
    {
      name: 'Nhà Thờ Chính Tòa Đà Lạt (Nhà Thờ Con Gà)',
      category: 'attraction',
      subcategory: 'museum',
      isOutdoor: false,
      hasAc: false,
      suitableWeather: ['rainy', 'sunny', 'cloudy'],
      priceLevel: 1,
      rating: 4.7,
      address: '15 Trần Phú, Phường 3, TP. Đà Lạt',
      description: 'Kiến trúc Roman cổ kính trung tâm thành phố.',
    },
    {
      name: 'Nhà Thờ Domaine de Marie',
      category: 'attraction',
      subcategory: 'check_in',
      isOutdoor: false,
      hasAc: false,
      suitableWeather: ['rainy', 'sunny', 'cloudy'],
      priceLevel: 1,
      rating: 4.7,
      address: '1 Ngô Quyền, Phường 6, TP. Đà Lạt',
      description: 'Nhà thờ màu hồng đặc trưng với khu trưng bày đồ len thủ công trong nhà.',
    },
    {
      name: 'Chùa Linh Phước (Chùa Ve Chai)',
      category: 'attraction',
      subcategory: 'museum',
      isOutdoor: false,
      hasAc: false,
      suitableWeather: ['rainy', 'sunny', 'cloudy'],
      priceLevel: 1,
      rating: 4.8,
      address: '120 Tự Phước, Trại Mát, Phường 11, TP. Đà Lạt',
      description: 'Ngôi chùa khảm sành độc đáo với nhiều tầng điện thờ lớn trong nhà.',
    },
    {
      name: 'Bảo Tàng Trà Cầu Đất',
      category: 'attraction',
      subcategory: 'museum',
      isOutdoor: false,
      hasAc: true,
      suitableWeather: ['rainy', 'cold', 'cloudy', 'sunny'],
      priceLevel: 2,
      rating: 4.6,
      address: 'Cầu Đất, Xã Trạm Hành, TP. Đà Lạt',
      description: 'Không gian triển lãm lịch sử trà 100 năm trong nhà máy cổ.',
    },
    {
      name: 'Xưởng Làm Gốm & Nến Thơm Đà Lạt',
      category: 'attraction',
      subcategory: 'workshop',
      isOutdoor: false,
      hasAc: true,
      suitableWeather: ['rainy', 'cold', 'cloudy'],
      priceLevel: 2,
      rating: 4.7,
      address: 'Hẻm 27 Lê Hồng Phong, Phường 4, TP. Đà Lạt',
      description: 'Workshop thủ công trong nhà lý tưởng cho buổi chiều mưa.',
    },
  ];

  extraAttractionsAndCafes.forEach((item, idx) => {
    places.push({
      ...item,
      lat: Number((11.932 + (idx % 7) * 0.0045).toFixed(5)),
      lng: Number((108.431 + (idx % 6) * 0.0052).toFixed(5)),
    });
  });

  // Add 25 more scenic cafes & attractions to reach 50 attractions/cafes
  for (let i = 1; i <= 25; i++) {
    const isIndoor = i % 2 === 0;
    const isCafe = i % 3 === 0;
    places.push({
      name: isCafe
        ? `Cà Phê Acoustic & Sách Đà Lạt #${i}`
        : isIndoor
          ? `Không Gian Triển Lãm Nghệ Thuật Đà Lạt #${i}`
          : `Đồi Ngắm Cảnh Thông Reo #${i}`,
      category: isCafe ? 'cafe' : 'attraction',
      subcategory: isIndoor ? 'workshop' : 'nature',
      isOutdoor: !isIndoor,
      hasAc: isIndoor,
      suitableWeather: isIndoor
        ? ['rainy', 'cold', 'cloudy', 'sunny']
        : ['sunny', 'cloudy'],
      priceLevel: ((i % 3) + 1) as 1 | 2 | 3,
      rating: Number((4.2 + (i % 7) * 0.1).toFixed(1)),
      address: `Số ${10 + i} Đường Trần Hưng Đạo, Phường ${(i % 10) + 1}, TP. Đà Lạt`,
      description: isIndoor
        ? 'Không gian trong nhà ấm cúng, phù hợp trú mưa và trải nghiệm văn hóa Đà Lạt.'
        : 'Không gian thoáng đãng ngoài trời ngắm rừng thông.',
      lat: Number((11.925 + (i % 9) * 0.0042).toFixed(5)),
      lng: Number((108.426 + ((i * 3) % 9) * 0.0045).toFixed(5)),
    });
  }

  // Add 60 more restaurants to reach 70 restaurants total
  const foodSubcategories = ['hotpot', 'bbq', 'noodles', 'refreshment'] as const;
  for (let i = 1; i <= 60; i++) {
    const sub = foodSubcategories[i % foodSubcategories.length];
    const isOutdoor = sub === 'bbq' && i % 3 === 0;
    const hasAc = sub === 'refreshment' || i % 2 === 0;
    const weatherTags =
      sub === 'hotpot' || sub === 'bbq'
        ? ['rainy', 'cold', 'cloudy']
        : sub === 'refreshment'
          ? ['sunny', 'hot', 'cloudy']
          : ['rainy', 'sunny', 'cloudy', 'cold'];

    places.push({
      name:
        sub === 'hotpot'
          ? `Quán Lẩu Đặc Sản Đà Lạt #${i}`
          : sub === 'bbq'
            ? `Tiệm Nướng Than Hoa Đà Lạt #${i}`
            : sub === 'noodles'
              ? `Quán Mì & Phở Nóng Gia Truyền #${i}`
              : `Tiệm Giải Khát & Kem Bơ Đà Lạt #${i}`,
      category: 'restaurant',
      subcategory: sub,
      isOutdoor,
      hasAc,
      suitableWeather: weatherTags,
      priceLevel: ((i % 3) + 1) as 1 | 2 | 3,
      rating: Number((4.1 + (i % 8) * 0.1).toFixed(1)),
      address: `Số ${20 + i} Đường Phan Đình Phùng, Phường ${(i % 9) + 1}, TP. Đà Lạt`,
      description: `Điểm ẩm thực ${sub} bản địa phục vụ du khách theo thời tiết thực tế.`,
      lat: Number((11.928 + (i % 10) * 0.0035).toFixed(5)),
      lng: Number((108.428 + ((i * 2) % 10) * 0.0038).toFixed(5)),
    });
  }

  return places;
}

function buildStaysCatalog(): SeedStay[] {
  const coreStays: SeedStay[] = [
    {
      name: 'The Kupid Dalat Homestay',
      stayType: 'homestay',
      pricePerNight: 650000,
      rating: 4.8,
      address: '47 Đặng Thái Thân, Phường 3, TP. Đà Lạt',
      lat: 11.9395,
      lng: 108.4528,
      amenities: ['wifi', 'parking', 'mountain_view', 'heater'],
    },
    {
      name: 'Colline Dalat Hotel',
      stayType: 'hotel',
      pricePerNight: 1850000,
      rating: 4.8,
      address: '10 Phan Bội Châu, Phường 1, TP. Đà Lạt',
      lat: 11.9421,
      lng: 108.4375,
      amenities: ['wifi', 'parking', 'breakfast', 'elevator', 'heater'],
    },
    {
      name: 'Ana Mandara Villas Dalat Resort & Spa',
      stayType: 'resort',
      pricePerNight: 3200000,
      rating: 4.9,
      address: 'Đường Lê Lai, Phường 5, TP. Đà Lạt',
      lat: 11.9482,
      lng: 108.4235,
      amenities: ['wifi', 'pool', 'spa', 'breakfast', 'garden'],
    },
    {
      name: 'LengKeng DaLat Homestay',
      stayType: 'homestay',
      pricePerNight: 580000,
      rating: 4.7,
      address: '57/4 Hoàng Hoa Thám, Phường 10, TP. Đà Lạt',
      lat: 11.9388,
      lng: 108.4642,
      amenities: ['wifi', 'mountain_view', 'bbq_garden'],
    },
    {
      name: 'Terracotta Hotel & Resort Dalat',
      stayType: 'resort',
      pricePerNight: 2100000,
      rating: 4.7,
      address: 'Phân khu chức năng 7.9, KDL Hồ Tuyền Lâm, Phường 3, TP. Đà Lạt',
      lat: 11.8965,
      lng: 108.4318,
      amenities: ['wifi', 'parking', 'lake_view', 'breakfast', 'indoor_pool'],
    },
  ];

  const stays: SeedStay[] = [...coreStays];
  const stayTypes = ['hotel', 'homestay', 'resort'] as const;

  for (let i = 1; i <= 35; i++) {
    const stayType = stayTypes[i % stayTypes.length];
    stays.push({
      name:
        stayType === 'hotel'
          ? `Khách Sạn Trung Tâm Đà Lạt #${i}`
          : stayType === 'homestay'
            ? `Homestay Đồi Thông Đà Lạt #${i}`
            : `Resort Nghỉ Dưỡng Đà Lạt #${i}`,
      stayType,
      pricePerNight:
        stayType === 'homestay'
          ? 450000 + (i % 5) * 80000
          : stayType === 'hotel'
            ? 900000 + (i % 6) * 150000
            : 2200000 + (i % 4) * 350000,
      rating: Number((4.2 + (i % 7) * 0.1).toFixed(1)),
      address: `Số ${5 + i} Đường Nguyễn Chí Thanh, Phường ${(i % 10) + 1}, TP. Đà Lạt`,
      lat: Number((11.926 + (i % 8) * 0.0044).toFixed(5)),
      lng: Number((108.427 + ((i * 3) % 8) * 0.0046).toFixed(5)),
      amenities: ['wifi', 'parking', 'heater', 'mountain_view'],
    });
  }

  return stays;
}

async function runSeed() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await queryRunner.query(`DELETE FROM "plan_b_swaps";`);
    await queryRunner.query(`DELETE FROM "itinerary_items";`);
    await queryRunner.query(`DELETE FROM "trips";`);
    await queryRunner.query(`DELETE FROM "places";`);
    await queryRunner.query(`DELETE FROM "stays";`);

    const places = buildFullPlacesCatalog();
    for (const p of places) {
      const wkt = toWktPoint({ lat: p.lat, lng: p.lng });
      await queryRunner.query(
        `
        INSERT INTO "places" (
          "name", "city", "category", "subcategory", "is_outdoor", "has_ac",
          "suitable_weather", "price_level", "rating", "address", "description", "location"
        ) VALUES (
          $1, 'Da Lat', $2, $3, $4, $5, $6, $7, $8, $9, $10,
          ST_GeomFromText($11, 4326)
        );
        `,
        [
          p.name,
          p.category,
          p.subcategory,
          p.isOutdoor,
          p.hasAc,
          p.suitableWeather,
          p.priceLevel,
          p.rating,
          p.address,
          p.description,
          wkt,
        ],
      );
    }

    const stays = buildStaysCatalog();
    for (const s of stays) {
      const wkt = toWktPoint({ lat: s.lat, lng: s.lng });
      await queryRunner.query(
        `
        INSERT INTO "stays" (
          "name", "city", "stay_type", "price_per_night", "rating",
          "address", "location", "amenities"
        ) VALUES (
          $1, 'Da Lat', $2, $3, $4, $5,
          ST_GeomFromText($6, 4326), $7::jsonb
        );
        `,
        [
          s.name,
          s.stayType,
          s.pricePerNight,
          s.rating,
          s.address,
          wkt,
          JSON.stringify(s.amenities),
        ],
      );
    }

    await queryRunner.commitTransaction();
    console.log(
      `Seeded ${places.length} places and ${stays.length} stays in Da Lat successfully.`,
    );
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

runSeed().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});
