import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRefs = useRef({});
  const mobileMenuRef = useRef(null);

  // 메뉴 구조 정의
  const menuItems = [
    {
      key: 'experience-lab',
      label: '체험실',
      path: '/experience-lab',
      submenus: [
        { key: 'early-retirement', label: '조기 은퇴 시뮬레이션', path: '/experience-lab?menu=early-retirement' },
        { key: 'domestic-high-dividend', label: '국내 고배당 ETF 시뮬레이션', path: '/experience-lab?menu=domestic-high-dividend' },
        { key: 'usa-high-dividend', label: '미국 고배당 ETF 시뮬레이션', path: '/experience-lab?menu=usa-high-dividend' },
      ],
    },
    // {
    //   key: 'investment-indicators',
    //   label: '투자지표',
    //   path: '/investment-indicators',
    //   submenus: [
    //     { key: 'usa-market-indicators', label: '미국시장지표', path: '/investment-indicators?menu=usa-market-indicators' },
    //   ],
    // },
    // {
    //   key: 'financial-status',
    //   label: '재무상태',
    //   path: '/financial-status',
    //   submenus: [
    //     { key: 'expense', label: '월평균지출', path: '/financial-status?menu=expense' },
    //     { key: 'isa', label: 'ISA', path: '/financial-status?menu=isa' },
    //     { key: 'pension-fund', label: '연금저축펀드', path: '/financial-status?menu=pension-fund' },
    //     { key: 'irp', label: 'IRP', path: '/financial-status?menu=irp' },
    //   ],
    // },
    // {
    //   key: 'target-setting',
    //   label: '시드모으기',
    //   path: '/target-setting',
    //   submenus: [
    //     { key: 'initial-setting', label: '조기은퇴 필요자산', path: '/target-setting?menu=initial-setting' },
    //     { key: 'isa-optimization', label: 'ISA 수익 최적화', path: '/target-setting?menu=isa-optimization' },
    //     { key: 'income', label: '소득목표', path: '/target-setting?menu=income' },
    //   ],
    // },
    // {
    //   key: 'settings',
    //   label: '환경설정',
    //   path: '/settings',
    //   submenus: [
    //     { key: 'basic', label: '기본설정', path: '/settings?menu=basic' },
    //     { key: 'investment-indicators-settings', label: '투자지표 설정', path: '/settings?menu=investment-indicators-settings' },
    //     { key: 'commoncode', label: '공통코드', path: '/settings?menu=commoncode' },
    //     { key: 'financial', label: '금융기관', path: '/settings?menu=financial' },
    //     { key: 'domestic-etf', label: '국내 ETF', path: '/settings?menu=domestic-etf' },
    //     { key: 'usa-etf', label: '미국 ETF', path: '/settings?menu=usa-etf' },
    //   ],
    // },
    // {
    //   key: 'free-living',
    //   label: '자유롭게살기',
    //   path: '/free-living',
    //   submenus: [],
    // },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleDropdown = (key) => {
    setOpenDropdown(openDropdown === key ? null : key);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 모바일 메뉴가 열려있을 때
      if (isMobileMenuOpen) {
        // 클릭된 요소가 모바일 메뉴 내부인지 확인
        const clickedElement = event.target;
        const isInsideMobileMenu = mobileMenuRef.current && mobileMenuRef.current.contains(clickedElement);
        
        // 모바일 메뉴 내부 클릭은 무시 (서브메뉴 토글 및 네비게이션 실행되도록)
        if (isInsideMobileMenu) {
          return; // 모바일 메뉴 내부의 모든 클릭은 외부 클릭으로 처리하지 않음
        }
        
        // 모바일 메뉴 외부 클릭 시 닫기
        const hamburgerButton = document.querySelector('.mobile-menu-button');
        if (hamburgerButton && !hamburgerButton.contains(clickedElement)) {
          closeMobileMenu();
        }
      }

      // 데스크톱 드롭다운 처리 (모바일이 아닐 때만)
      if (!isMobileMenuOpen) {
        const isOutside = Object.values(dropdownRefs.current).every(
          (ref) => ref && !ref.contains(event.target)
        );
        if (isOutside && openDropdown) {
          closeDropdown();
        }
      }
    };

    if (openDropdown || isMobileMenuOpen) {
      // click 이벤트 사용 (mousedown/touchstart보다 나중에 발생)
      document.addEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [openDropdown, isMobileMenuOpen]);

  // 현재 경로에 따라 활성 드롭다운 설정
  // 서브메뉴가 활성화되어 있으면 드롭다운을 자동으로 열지 않음
  useEffect(() => {
    const activeMenu = menuItems.find((item) => isActive(item.path));
    if (activeMenu && activeMenu.submenus && activeMenu.submenus.length > 0) {
      // 현재 활성화된 서브메뉴가 있는지 확인
      const hasActiveSubmenu = activeMenu.submenus.some(
        (submenu) =>
          location.pathname === activeMenu.path &&
          new URLSearchParams(location.search).get('menu') === submenu.key
      );
      
      // 서브메뉴가 활성화되어 있지 않을 때만 드롭다운 자동 열기
      if (!hasActiveSubmenu) {
        setOpenDropdown(activeMenu.key);
      } else {
        // 서브메뉴가 활성화되어 있으면 드롭다운 닫기
        setOpenDropdown(null);
      }
    } else {
      // 활성 메뉴가 없거나 서브메뉴가 없으면 드롭다운 닫기
      setOpenDropdown(null);
    }
  }, [location.pathname, location.search]);

  // 경로 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  const renderMobileSubmenu = (item) => {
    if (!item.submenus || item.submenus.length === 0) {
      return null;
    }

    const isItemActive = isActive(item.path);
    const isOpen = openDropdown === item.key;

    return (
      <div className="mobile-submenu">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown(item.key);
          }}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
            isItemActive
              ? 'text-wealth-gold'
              : 'text-wealth-muted hover:text-white'
          }`}
        >
          <span>{item.label}</span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="bg-wealth-card/30 border-t border-gray-700">
            {item.submenus.map((submenu) => {
              const isSubmenuActive =
                location.pathname === item.path &&
                new URLSearchParams(location.search).get('menu') === submenu.key;

              return (
                <Link
                  key={submenu.key}
                  to={submenu.path}
                  onClick={(e) => {
                    // 이벤트 전파 중지
                    e.stopPropagation();
                    // 메뉴 닫기 (네비게이션은 Link가 자동으로 처리)
                    closeMobileMenu();
                    closeDropdown(); // 데스크톱 드롭다운도 닫기
                  }}
                  className={`block px-8 py-3 text-sm transition-colors ${
                    isSubmenuActive
                      ? 'bg-wealth-gold/20 text-wealth-gold font-medium'
                      : 'text-wealth-muted hover:bg-wealth-card/50 hover:text-white'
                  }`}
                >
                  {submenu.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="bg-wealth-card/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* 로고/브랜드 영역 */}
            <Link
              to="/"
              className="flex items-center space-x-2 text-wealth-gold hover:text-yellow-500 transition-colors"
            >
              <svg
                className="w-8 h-8 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-lg font-bold hidden sm:inline whitespace-nowrap">조기은퇴연구소</span>
            </Link>
          </div>
          
          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-1">

            {/* 드롭다운 메뉴들 */}
            {menuItems.map((item) => {
              const isItemActive = isActive(item.path);
              const isOpen = openDropdown === item.key;
              const hasSubmenus = item.submenus && item.submenus.length > 0;

              return (
                <div
                  key={item.key}
                  ref={(el) => (dropdownRefs.current[item.key] = el)}
                  className="relative"
                >
                  {hasSubmenus ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(item.key);
                        }}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center space-x-1 ${
                          isItemActive
                            ? 'text-wealth-gold font-medium border-b-2 border-wealth-gold'
                            : 'text-wealth-muted hover:text-wealth-gold'
                        }`}
                      >
                        <span>{item.label}</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="absolute top-full left-0 mt-1 min-w-full w-auto bg-wealth-card border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                          {item.submenus.map((submenu) => {
                            const isSubmenuActive =
                              location.pathname === item.path &&
                              new URLSearchParams(location.search).get('menu') === submenu.key;

                            return (
                              <Link
                                key={submenu.key}
                                to={submenu.path}
                                onClick={closeDropdown}
                                className={`flex items-center px-4 py-3 text-sm transition-colors whitespace-nowrap ${
                                  isSubmenuActive
                                    ? 'bg-wealth-gold/20 text-wealth-gold font-medium'
                                    : 'text-wealth-muted hover:bg-wealth-card/80 hover:text-white'
                                }`}
                              >
                                <span>{submenu.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        isItemActive
                          ? 'text-wealth-gold font-medium'
                          : 'text-wealth-muted hover:text-wealth-gold'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              );
            })}

            {/* 로그인/로그아웃 */}
            {/* {user ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg transition-colors text-sm font-medium text-wealth-muted hover:text-wealth-gold"
              >
                로그아웃
              </button>
            ) : (
              <Link
                to="/login"
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive('/login')
                    ? 'text-wealth-gold font-medium'
                    : 'text-wealth-muted hover:text-wealth-gold'
                }`}
              >
                로그인
              </Link>
            )} */}
          </nav>

          {/* 모바일 햄버거 메뉴 버튼 */}
          <div className="md:hidden flex items-center space-x-4">
            <button
              onClick={toggleMobileMenu}
              className="mobile-menu-button p-2 text-wealth-muted hover:text-wealth-gold transition-colors"
              aria-label="메뉴 열기"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden absolute top-full left-0 right-0 bg-wealth-card border-b border-gray-800 shadow-xl max-h-[calc(100vh-73px)] overflow-y-auto"
        >

          {/* 메뉴 항목들 */}
          {menuItems.map((item) => {
            const hasSubmenus = item.submenus && item.submenus.length > 0;
            const isItemActive = isActive(item.path);

            if (hasSubmenus) {
              return (
                <div key={item.key} className="border-b border-gray-700">
                  {renderMobileSubmenu(item)}
                </div>
              );
            } else {
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMobileMenu();
                  }}
                  className={`block px-4 py-3 text-sm font-medium transition-colors border-b border-gray-700 ${
                    isItemActive
                      ? 'bg-wealth-gold/20 text-wealth-gold'
                      : 'text-wealth-muted hover:bg-wealth-card/50 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            }
          })}

          {/* 로그인/로그아웃 */}
          {/* <div className="border-t border-gray-700">
            {user ? (
              <button
                onClick={() => {
                  handleLogout();
                  closeMobileMenu();
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-wealth-muted hover:bg-wealth-card/50 hover:text-white transition-colors"
              >
                로그아웃
              </button>
            ) : (
              <Link
                to="/login"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMobileMenu();
                }}
                className={`block px-4 py-3 text-sm font-medium transition-colors ${
                  isActive('/login')
                    ? 'bg-wealth-gold/20 text-wealth-gold'
                    : 'text-wealth-muted hover:bg-wealth-card/50 hover:text-white'
                }`}
              >
                로그인
              </Link>
            )}
          </div> */}
        </div>
      )}
    </header>
  );
};

export default TopNav;
